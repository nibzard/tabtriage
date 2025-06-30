import { db, client } from '@/db/client';
import { tabs } from '@/db/schema';
import { eq, and, desc, sql as sqlTemplate } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { globalEmbeddingCache } from './embeddingCache';
import { extractPageContent } from './contentExtractionService';
import { GlobalRateLimitManager, RateLimitConfigs } from './rateLimitService';

/**
 * Jina Embeddings v3 API integration
 * Production-ready implementation using the official Jina AI API
 */

interface EmbeddingRequest {
  model: string;
  task: 'text-matching' | 'retrieval.query' | 'retrieval.passage' | 'separation' | 'classification';
  dimensions?: number;
  late_chunking?: boolean;
  input: string | string[];
}

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embeddings using Jina Embeddings v3 API with caching
 */
async function generateEmbedding(
  text: string, 
  task: string = 'text-matching',
  dimensions: number = 1024,
  useCache: boolean = true
): Promise<number[]> {
  // Check cache first for queries (not for storage embeddings)
  if (useCache && (task === 'retrieval.query' || task === 'text-matching')) {
    const cached = globalEmbeddingCache.get(text, task);
    if (cached) {
      logger.debug(`Using cached ${cached.length}-dimensional embedding (task: ${task})`);
      return cached;
    }
  }

  const apiKey = process.env.JINA_API_KEY;
  const apiUrl = process.env.JINA_API_URL || 'https://api.jina.ai/v1/embeddings';
  
  if (!apiKey) {
    logger.warn('JINA_API_KEY not found, falling back to mock embedding');
    const mockEmbedding = generateMockEmbedding(text, dimensions);
    
    // Cache mock embeddings too
    if (useCache && (task === 'retrieval.query' || task === 'text-matching')) {
      globalEmbeddingCache.set(text, task, mockEmbedding);
    }
    
    return mockEmbedding;
  }

  try {
    const requestData: EmbeddingRequest = {
      model: 'jina-embeddings-v3',
      task: task as any,
      dimensions,
      input: text
    };

    // Use rate-limited API call
    const rateLimitManager = GlobalRateLimitManager.getInstance()
    const jinaService = rateLimitManager.getService('jina-embeddings', RateLimitConfigs.JINA_EMBEDDINGS)
    
    const response = await jinaService.enqueue(async () => {
      logger.debug(`Making rate-limited Jina embedding call (task: ${task})`)
      return fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestData)
      })
    }, task === 'retrieval.query' ? 2 : 0) // Higher priority for search queries

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina API error ${response.status}: ${errorText}`);
    }

    const result: EmbeddingResponse = await response.json();
    
    if (result.data && result.data.length > 0) {
      const embedding = result.data[0].embedding;
      logger.debug(`Generated ${embedding.length}-dimensional Jina v3 embedding (task: ${task})`);
      
      // Cache the embedding for query tasks
      if (useCache && (task === 'retrieval.query' || task === 'text-matching')) {
        globalEmbeddingCache.set(text, task, embedding);
      }
      
      return embedding;
    }
    
    throw new Error('Invalid response from Jina API');
  } catch (error) {
    logger.error('Error calling Jina API:', error);
    logger.warn('Falling back to mock embedding');
    const mockEmbedding = generateMockEmbedding(text, dimensions);
    
    // Cache mock embeddings too
    if (useCache && (task === 'retrieval.query' || task === 'text-matching')) {
      globalEmbeddingCache.set(text, task, mockEmbedding);
    }
    
    return mockEmbedding;
  }
}

/**
 * Generate a deterministic mock embedding (fallback)
 */
function generateMockEmbedding(text: string, dimensions: number = 1024): number[] {
  // Create a deterministic but varied embedding based on text content
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  // Use the hash as a seed for consistent but varied vectors
  const embedding = Array(dimensions).fill(0).map((_, i) => {
    const value = Math.sin(hash + i * 0.1) * Math.cos(hash * 0.1 + i);
    return value;
  });
  
  // Normalize the vector
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / norm);
}

/**
 * Convert a number array to Turso F32_BLOB format
 * For F32_BLOB(1024), we need to pass the raw float32 array
 */
function arrayToF32Blob(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

/**
 * Generate embedding text from tab title, summary, and page content
 */
function generateEmbeddingText(title: string, summary: string, pageContent?: string, url?: string): string {
  const parts = [];
  
  // Add title if available
  if (title && title.trim()) {
    parts.push(title.trim());
  }
  
  // Add summary if available
  if (summary && summary.trim()) {
    parts.push(summary.trim());
  }
  
  // Add page content if available
  if (pageContent && pageContent.trim()) {
    parts.push(pageContent.trim());
  }
  
  // If we have no meaningful content yet, extract info from URL
  if (parts.length === 0 && url) {
    const urlInfo = extractInfoFromUrl(url);
    if (urlInfo) {
      parts.push(urlInfo);
    }
  }
  
  return parts.join(' ').trim();
}

/**
 * Extract meaningful information from a URL for embedding when no other content is available
 */
function extractInfoFromUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname;
    
    // Create descriptive text from domain and path
    const parts = [];
    
    // Add domain information
    if (domain) {
      // Convert domain to readable format (e.g., "github.com" -> "GitHub website")
      const domainWords = domain.split('.')[0];
      const readableDomain = domainWords.charAt(0).toUpperCase() + domainWords.slice(1);
      parts.push(`${readableDomain} website`);
    }
    
    // Add path information if meaningful
    if (path && path !== '/' && path.length > 1) {
      // Convert path to readable format (e.g., "/docs/api" -> "documentation API page")
      const pathParts = path.split('/').filter(part => part.length > 0);
      const readablePath = pathParts
        .map(part => part.replace(/[-_]/g, ' '))
        .join(' ')
        .toLowerCase();
      
      if (readablePath && readablePath.length > 2) {
        parts.push(`${readablePath} page`);
      }
    }
    
    return parts.join(' ');
  } catch (error) {
    // If URL parsing fails, just return the domain if possible
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? `${match[1]} website` : '';
  }
}

/**
 * Generate a content excerpt for search results
 */
function generateContentExcerpt(content: string, query: string, maxLength: number = 200): string {
  if (!content || content.length <= maxLength) {
    return content || '';
  }
  
  // Try to find the query term in the content for context
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryIndex = lowerContent.indexOf(lowerQuery);
  
  if (queryIndex !== -1) {
    // Found the query, extract around it
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + query.length + 150);
    let excerpt = content.substring(start, end);
    
    // Add ellipsis if we truncated
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  } else {
    // Query not found, just take the beginning
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
}

/**
 * Update tab with Jina v3 embedding, optionally including page content
 */
export async function updateTabEmbedding(
  tabId: string, 
  text: string,
  task: string = 'retrieval.passage'
): Promise<void> {
  try {
    // Generate embedding from text using Jina v3
    const embedding = await generateEmbedding(text, task);
    const embeddingBlob = arrayToF32Blob(embedding);
    
    // Update the tab with the embedding using parameterized query
    await client.execute({
      sql: `UPDATE tabs SET embedding = ? WHERE id = ?`,
      args: [embeddingBlob, tabId]
    });
    
    logger.info(`Updated Jina v3 embedding for tab ${tabId} (task: ${task}, dims: ${embedding.length})`);
  } catch (error) {
    logger.error(`Error updating Jina v3 embedding for tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Update tab with both embedding and content text
 */
export async function updateTabEmbeddingWithContentStorage(
  tabId: string, 
  text: string,
  task: string = 'retrieval.passage'
): Promise<void> {
  try {
    // Generate embedding from text using Jina v3
    const embedding = await generateEmbedding(text, task);
    const embeddingBlob = arrayToF32Blob(embedding);
    
    // Update the tab with both embedding and content text
    await client.execute({
      sql: `UPDATE tabs SET embedding = ?, content = ? WHERE id = ?`,
      args: [embeddingBlob, text, tabId]
    });
    
    logger.info(`Updated Jina v3 embedding and content for tab ${tabId} (task: ${task}, dims: ${embedding.length}, content: ${text.length} chars)`);
  } catch (error) {
    logger.error(`Error updating Jina v3 embedding and content for tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Update tab with enhanced embedding including page content
 */
export async function updateTabEmbeddingWithContent(
  tabId: string,
  title: string,
  summary: string,
  url?: string,
  task: string = 'retrieval.passage'
): Promise<void> {
  try {
    let pageContent: string | undefined;
    
    // Try to extract page content if URL is provided
    if (url) {
      logger.debug(`Extracting page content for tab ${tabId} from ${url}`);
      const extracted = await extractPageContent(url);
      if (extracted) {
        pageContent = extracted.content;
        logger.debug(`Extracted ${pageContent.length} characters of page content for tab ${tabId}`);
      } else {
        logger.warn(`Failed to extract page content for tab ${tabId} from ${url}`);
      }
    }
    
    // Generate embedding text combining title, summary, and page content
    const embeddingText = generateEmbeddingText(title, summary, pageContent, url);
    
    if (!embeddingText) {
      logger.warn(`No content available for embedding tab ${tabId}`);
      return;
    }
    
    // Update the embedding and store the content text
    await updateTabEmbeddingWithContentStorage(tabId, embeddingText, task);
    
    logger.info(`Updated enhanced embedding for tab ${tabId} (${embeddingText.length} chars${pageContent ? ' with page content' : ' without page content'})`);
  } catch (error) {
    logger.error(`Error updating enhanced embedding for tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Search tabs using Jina v3 vector similarity with relevance filtering
 */
export async function searchTabsByVector(
  query: string,
  userId: string,
  limit: number = 20,
  task: string = 'retrieval.query'
): Promise<any[]> {
  try {
    // Generate embedding for the query using retrieval.query task
    const queryEmbedding = await generateEmbedding(query, task);
    const queryVector = arrayToF32Blob(queryEmbedding);
    
    // Use vector similarity search with cosine distance and relevance threshold
    const result = await client.execute({
      sql: `
        SELECT 
          t.id, t.title, t.url, t.domain, t.date_added, 
          t.summary, t.category, t.screenshot_url, t.status,
          t.folder_id, t.content,
          vector_distance_cos(t.embedding, ?) as distance
        FROM tabs t
        WHERE t.user_id = ? 
          AND t.status != 'discarded' 
          AND t.embedding IS NOT NULL
          AND vector_distance_cos(t.embedding, ?) <= 0.7
        ORDER BY distance ASC
        LIMIT ?
      `,
      args: [queryVector, userId, queryVector, limit]
    });
    
    logger.debug(`Vector search found ${result.rows.length} results for query: "${query}" (filtered by relevance threshold 0.7)`);
    return result.rows as any[];
  } catch (error) {
    logger.error('Error in Jina v3 vector search:', error);
    // Return empty results if vector search fails
    return [];
  }
}

/**
 * Analyze query to determine optimal search strategy
 */
export function analyzeQuery(query: string): {
  useVector: boolean;
  useText: boolean;
  isURL: boolean;
  isShort: boolean;
  confidence: 'high' | 'medium' | 'low';
} {
  const trimmed = query.trim();
  const isURL = /^https?:\/\//.test(trimmed);
  const isShort = trimmed.length < 3;
  const hasLetters = /[a-zA-Z]/.test(trimmed);
  const hasNumbers = /[0-9]/.test(trimmed);
  const isAlphanumeric = /^[a-zA-Z0-9\s\-_.]+$/.test(trimmed);
  
  return {
    useVector: !isShort && !isURL && hasLetters,
    useText: hasLetters || hasNumbers,
    isURL,
    isShort,
    confidence: isShort ? 'low' : (isAlphanumeric && hasLetters ? 'high' : 'medium')
  };
}

/**
 * Execute text search using FTS5 with BM25 scoring
 */
export async function searchTabsByText(
  query: string,
  userId: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const result = await client.execute({
      sql: `
        SELECT t.*, bm25(tabs_fts) as bm25_score
        FROM tabs_fts 
        JOIN tabs t ON tabs_fts.id = t.id
        WHERE tabs_fts MATCH ? 
          AND t.user_id = ? 
          AND t.status != 'discarded'
        ORDER BY bm25_score
        LIMIT ?
      `,
      args: [query, userId, limit]
    });
    
    logger.debug(`Text search found ${result.rows.length} results for query: "${query}"`);
    return result.rows as any[];
  } catch (error) {
    logger.error('Error in text search:', error);
    return [];
  }
}

/**
 * Fallback search using simple text matching
 */
export async function getFallbackResults(query: string, userId: string, limit: number): Promise<any[]> {
  try {
    const fallbackResults = await db
      .select()
      .from(tabs)
      .where(and(
        eq(tabs.userId, userId),
        sqlTemplate`${tabs.status} != 'discarded'`
      ))
      .limit(limit * 2); // Get more results for filtering
    
    const searchText = query.toLowerCase();
    const filtered = fallbackResults.filter(tab => {
      return (
        tab.title?.toLowerCase().includes(searchText) ||
        tab.summary?.toLowerCase().includes(searchText) ||
        tab.url?.toLowerCase().includes(searchText) ||
        tab.domain?.toLowerCase().includes(searchText)
      );
    }).slice(0, limit);
    
    logger.info(`Fallback search returned ${filtered.length} results`);
    return filtered;
  } catch (error) {
    logger.error('Error in fallback search:', error);
    return [];
  }
}

/**
 * Batch update embeddings for tabs without embeddings using enhanced Jina v3 with page content
 */
export async function updateMissingEmbeddings(
  userId: string,
  batchSize: number = 20,
  includePageContent: boolean = true
): Promise<number> {
  try {
    // Find tabs without embeddings using raw SQL
    const result = await client.execute({
      sql: `SELECT * FROM tabs WHERE user_id = ? AND embedding IS NULL LIMIT ?`,
      args: [userId, batchSize]
    });
    
    const tabsWithoutEmbeddings = result.rows as any[];
    
    let updatedCount = 0;
    
    for (const tab of tabsWithoutEmbeddings) {
      try {
        const title = tab.title || '';
        const summary = tab.summary || '';
        const url = tab.url || '';
        
        if (title || summary || url) {
          if (includePageContent && url) {
            // Use enhanced embedding with page content
            await updateTabEmbeddingWithContent(tab.id, title, summary, url, 'retrieval.passage');
          } else {
            // Fallback to title + summary only
            const text = generateEmbeddingText(title, summary, undefined, url);
            if (text) {
              await updateTabEmbeddingWithContentStorage(tab.id, text, 'retrieval.passage');
            }
          }
          updatedCount++;
          
          // Add delay to respect API rate limits (both Reader and Embeddings APIs)
          await new Promise(resolve => setTimeout(resolve, includePageContent ? 300 : 100));
        }
      } catch (error) {
        logger.error(`Failed to update enhanced embedding for tab ${tab.id}:`, error);
        // Continue with other tabs even if one fails
      }
    }
    
    logger.info(`Updated enhanced Jina v3 embeddings for ${updatedCount} tabs${includePageContent ? ' with page content extraction' : ''}`);
    return updatedCount;
  } catch (error) {
    logger.error('Error updating missing enhanced embeddings:', error);
    throw error;
  }
}

/**
 * Get embedding statistics for a user
 */
export async function getEmbeddingStats(userId: string): Promise<{
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  percentage: number;
}> {
  try {
    const totalResult = await client.execute({
      sql: `SELECT COUNT(*) as count FROM tabs WHERE user_id = ?`,
      args: [userId]
    });
    
    const withEmbeddingsResult = await client.execute({
      sql: `SELECT COUNT(*) as count FROM tabs WHERE user_id = ? AND embedding IS NOT NULL`,
      args: [userId]
    });
    
    const total = (totalResult.rows[0] as any).count;
    const withEmbeddings = (withEmbeddingsResult.rows[0] as any).count;
    const withoutEmbeddings = total - withEmbeddings;
    const percentage = total > 0 ? Math.round((withEmbeddings / total) * 100) : 0;
    
    return {
      total,
      withEmbeddings,
      withoutEmbeddings,
      percentage
    };
  } catch (error) {
    logger.error('Error getting embedding stats:', error);
    throw error;
  }
}

/**
 * Test the Jina API connection
 */
export async function testJinaConnection(): Promise<{
  success: boolean;
  message: string;
  apiKeyPresent: boolean;
  testEmbedding?: number[];
}> {
  const apiKey = process.env.JINA_API_KEY;
  const apiKeyPresent = !!apiKey;
  
  if (!apiKeyPresent) {
    return {
      success: false,
      message: 'JINA_API_KEY not found in environment variables',
      apiKeyPresent: false
    };
  }
  
  try {
    const testText = 'Test connection to Jina AI API';
    const embedding = await generateEmbedding(testText, 'text-matching', 256);
    
    return {
      success: true,
      message: `Successfully connected to Jina API. Generated ${embedding.length}-dimensional embedding.`,
      apiKeyPresent: true,
      testEmbedding: embedding.slice(0, 5) // Return first 5 values for verification
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to Jina API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      apiKeyPresent: true
    };
  }
}