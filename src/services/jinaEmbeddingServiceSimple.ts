import { db, client } from '@/db/client';
import { tabs } from '@/db/schema';
import { eq, and, desc, sql as sqlTemplate } from 'drizzle-orm';
import { logger } from '@/utils/logger';

/**
 * Simple Jina v3 embedding service that generates mock embeddings
 * This avoids dependency issues while maintaining the same API
 */

/**
 * Generate a normalized mock embedding vector
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
 * Convert a number array to Turso vector format
 */
function arrayToVector(arr: number[]): string {
  return `vector32('[${arr.join(', ')}]')`;
}

/**
 * Update tab with mock Jina v3 embedding
 */
export async function updateTabEmbedding(
  tabId: string, 
  text: string,
  task: string = 'text-matching'
): Promise<void> {
  try {
    // Generate mock embedding (deterministic based on text)
    const embedding = generateMockEmbedding(text, 1024);
    const vectorStr = arrayToVector(embedding);
    
    // Update the tab with the embedding using raw SQL
    await client.execute({
      sql: `UPDATE tabs SET embedding_vector = ${vectorStr} WHERE id = ?`,
      args: [tabId]
    });
    
    logger.info(`Updated mock Jina v3 embedding for tab ${tabId} (task: ${task})`);
  } catch (error) {
    logger.error(`Error updating mock embedding for tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Search tabs using mock vector similarity
 */
export async function searchTabsByVector(
  query: string,
  userId: string,
  limit: number = 20,
  task: string = 'retrieval.query'
): Promise<any[]> {
  try {
    // Generate mock embedding for the query
    const queryEmbedding = generateMockEmbedding(query, 1024);
    const queryVector = arrayToVector(queryEmbedding);
    
    // Use vector similarity search with cosine distance
    const result = await client.execute({
      sql: `
        SELECT 
          t.id, t.title, t.url, t.domain, t.date_added, 
          t.summary, t.category, t.screenshot_url, t.status,
          t.folder_id,
          vector_distance_cos(t.embedding_vector, ${queryVector}) as distance
        FROM tabs t
        WHERE t.user_id = ? 
          AND t.status != 'discarded' 
          AND t.embedding_vector IS NOT NULL
        ORDER BY distance ASC
        LIMIT ?
      `,
      args: [userId, limit]
    });
    
    return result.rows as any[];
  } catch (error) {
    logger.error('Error in mock vector search:', error);
    // Fall back to empty results if vector search fails
    return [];
  }
}

/**
 * Hybrid search combining mock vector similarity and text search
 */
export async function hybridSearch(
  query: string,
  userId: string,
  options: {
    limit?: number;
    vectorWeight?: number;
    textWeight?: number;
    vectorTask?: string;
  } = {}
): Promise<any[]> {
  const { 
    limit = 20, 
    vectorWeight = 0.7, 
    textWeight = 0.3,
    vectorTask = 'retrieval.query'
  } = options;
  
  try {
    // Get vector search results using mock embeddings
    const vectorResults = await searchTabsByVector(query, userId, limit * 2, vectorTask);
    
    // Get text search results using FTS5
    const textResults = await client.execute({
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
      args: [query, userId, limit * 2]
    });
    
    // Combine and rank results
    const combinedResults = new Map<string, any>();
    
    // Add vector results with scores
    vectorResults.forEach((result, index) => {
      // Convert distance to similarity score (lower distance = higher similarity)
      const similarityScore = 1 / (1 + (result.distance || 0));
      const score = vectorWeight * similarityScore;
      combinedResults.set(result.id, { ...result, score, vectorRank: index + 1 });
    });
    
    // Add or update with text results
    (textResults.rows as any[]).forEach((result, index) => {
      // BM25 score (higher is better)
      const textScore = textWeight * Math.max(0, result.bm25_score || 0);
      if (combinedResults.has(result.id)) {
        const existing = combinedResults.get(result.id);
        existing.score += textScore;
        existing.textRank = index + 1;
        existing.bm25Score = result.bm25_score;
      } else {
        combinedResults.set(result.id, { 
          ...result, 
          score: textScore, 
          textRank: index + 1,
          bm25Score: result.bm25_score
        });
      }
    });
    
    // Sort by combined score and return top results
    const finalResults = Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    logger.info(`Mock hybrid search returned ${finalResults.length} results (vector: ${vectorResults.length}, text: ${textResults.rows.length})`);
    return finalResults;
  } catch (error) {
    logger.error('Error in mock hybrid search:', error);
    
    // Fall back to simple text search
    const fallbackResults = await db
      .select()
      .from(tabs)
      .where(and(
        eq(tabs.userId, userId),
        sqlTemplate`${tabs.status} != 'discarded'`
      ))
      .limit(limit);
    
    return fallbackResults.filter(tab => {
      const searchText = query.toLowerCase();
      return (
        tab.title?.toLowerCase().includes(searchText) ||
        tab.summary?.toLowerCase().includes(searchText) ||
        tab.url?.toLowerCase().includes(searchText)
      );
    });
  }
}

/**
 * Batch update embeddings for tabs without embeddings using mock vectors
 */
export async function updateMissingEmbeddings(
  userId: string,
  batchSize: number = 50
): Promise<number> {
  try {
    // Find tabs without embeddings using raw SQL
    const result = await client.execute({
      sql: `SELECT * FROM tabs WHERE user_id = ? AND embedding_vector IS NULL LIMIT ?`,
      args: [userId, batchSize]
    });
    
    const tabsWithoutEmbeddings = result.rows as any[];
    
    let updatedCount = 0;
    
    for (const tab of tabsWithoutEmbeddings) {
      try {
        const text = `${tab.title} ${tab.summary || ''}`.trim();
        if (text) {
          // Use 'retrieval.passage' task for stored content
          await updateTabEmbedding(tab.id, text, 'retrieval.passage');
          updatedCount++;
        }
      } catch (error) {
        logger.error(`Failed to update mock embedding for tab ${tab.id}:`, error);
      }
    }
    
    logger.info(`Updated mock embeddings for ${updatedCount} tabs`);
    return updatedCount;
  } catch (error) {
    logger.error('Error updating missing mock embeddings:', error);
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
      sql: `SELECT COUNT(*) as count FROM tabs WHERE user_id = ? AND embedding_vector IS NOT NULL`,
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