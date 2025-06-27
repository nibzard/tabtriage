import { db, client } from '@/db/client';
import { tabs } from '@/db/schema';
import { eq, and, desc, sql as sqlTemplate } from 'drizzle-orm';
import { logger } from '@/utils/logger';

/**
 * Generate embeddings using the GTE-Small model
 * In production, this would call the actual GTE-Small API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // TODO: Implement actual GTE-Small embedding generation
    // For now, return a mock 384-dimensional vector
    const mockVector = Array(384).fill(0).map(() => Math.random() * 2 - 1);
    return mockVector;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Convert a number array to Turso vector format
 */
function arrayToVector(arr: number[]): string {
  return `vector32('[${arr.join(', ')}]')`;
}

/**
 * Update tab with embedding
 */
export async function updateTabEmbedding(tabId: string, text: string): Promise<void> {
  try {
    // Generate embedding from text (title + summary)
    const embedding = await generateEmbedding(text);
    const vectorStr = arrayToVector(embedding);
    
    // Update the tab with the embedding using raw SQL
    await client.execute({
      sql: `UPDATE tabs SET embedding_vector = ${vectorStr} WHERE id = ?`,
      args: [tabId]
    });
    
    logger.info(`Updated embedding for tab ${tabId}`);
  } catch (error) {
    logger.error(`Error updating embedding for tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Search tabs using vector similarity
 */
export async function searchTabsByVector(
  query: string,
  userId: string,
  limit: number = 20
): Promise<any[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
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
    logger.error('Error in vector search:', error);
    // Fall back to regular search if vector search fails
    return [];
  }
}

/**
 * Hybrid search combining vector similarity and text search
 */
export async function hybridSearch(
  query: string,
  userId: string,
  options: {
    limit?: number;
    vectorWeight?: number;
    textWeight?: number;
  } = {}
): Promise<any[]> {
  const { limit = 20, vectorWeight = 0.7, textWeight = 0.3 } = options;
  
  try {
    // Get vector search results
    const vectorResults = await searchTabsByVector(query, userId, limit * 2);
    
    // Get text search results using FTS5
    const textResults = await client.execute({
      sql: `
        SELECT t.* 
        FROM tabs_fts 
        JOIN tabs t ON tabs_fts.id = t.id
        WHERE tabs_fts MATCH ? 
          AND t.user_id = ? 
          AND t.status != 'discarded'
        LIMIT ?
      `,
      args: [query, userId, limit * 2]
    });
    
    // Combine and rank results
    const combinedResults = new Map<string, any>();
    
    // Add vector results with scores
    vectorResults.forEach((result, index) => {
      const score = vectorWeight * (1 - index / vectorResults.length);
      combinedResults.set(result.id, { ...result, score });
    });
    
    // Add or update with text results
    (textResults.rows as any[]).forEach((result, index) => {
      const textScore = textWeight * (1 - index / textResults.rows.length);
      if (combinedResults.has(result.id)) {
        const existing = combinedResults.get(result.id);
        existing.score += textScore;
      } else {
        combinedResults.set(result.id, { ...result, score: textScore });
      }
    });
    
    // Sort by combined score and return top results
    const finalResults = Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return finalResults;
  } catch (error) {
    logger.error('Error in hybrid search:', error);
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
 * Batch update embeddings for tabs without embeddings
 */
export async function updateMissingEmbeddings(userId: string): Promise<number> {
  try {
    // Find tabs without embeddings using raw SQL
    const result = await client.execute({
      sql: `SELECT * FROM tabs WHERE user_id = ? AND embedding_vector IS NULL LIMIT 100`,
      args: [userId]
    });
    
    const tabsWithoutEmbeddings = result.rows as any[];
    
    let updatedCount = 0;
    
    for (const tab of tabsWithoutEmbeddings) {
      try {
        const text = `${tab.title} ${tab.summary || ''}`.trim();
        if (text) {
          await updateTabEmbedding(tab.id, text);
          updatedCount++;
        }
      } catch (error) {
        logger.error(`Failed to update embedding for tab ${tab.id}:`, error);
      }
    }
    
    logger.info(`Updated embeddings for ${updatedCount} tabs`);
    return updatedCount;
  } catch (error) {
    logger.error('Error updating missing embeddings:', error);
    throw error;
  }
}