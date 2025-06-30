import { db, client } from '@/db/client';
import { tabs } from '@/db/schema';
import { eq, and, desc, sql as sqlTemplate } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { globalEmbeddingCache } from './embeddingCache';
import { extractPageContent } from './contentExtractionService';
import { generateEmbedding, generateContentExcerpt, getFallbackResults, searchTabsByText, searchTabsByVector } from './jinaEmbeddingService';


/**
 * Reciprocal Rank Fusion (RRF) for combining search results
 */
function reciprocalRankFusion(results: any[][], k: number = 20): any[] {
  const rankedResults = new Map<string, { score: number; result: any }>();

  results.forEach(resultSet => {
    resultSet.forEach((result, index) => {
      const rank = index + 1;
      const score = 1 / (k + rank);

      if (rankedResults.has(result.id)) {
        const existing = rankedResults.get(result.id)!;
        existing.score += score;
      } else {
        rankedResults.set(result.id, { score, result });
      }
    });
  });

  return Array.from(rankedResults.values())
    .sort((a, b) => b.score - a.score)
    .map(item => item.result);
}

function legacyRank(vectorResults: any[], textResults: any[], vectorWeight: number, textWeight: number): any[] {
  const combinedResults = new Map<string, any>();

  if (vectorResults.length > 0) {
    vectorResults.forEach((result, index) => {
      const similarityScore = Math.max(0, 1 - (result.distance || 1));
      const score = vectorWeight * similarityScore;
      combinedResults.set(result.id, { ...result, score, vectorRank: index + 1 });
    });
  }

  if (textResults.length > 0) {
    textResults.forEach((result, index) => {
      // Better BM25 normalization using sigmoid function for more natural scaling
      const bm25Raw = result.bm25_score || 0;
      const normalizedBM25 = bm25Raw > 0 ? Math.min(1, bm25Raw / (bm25Raw + 5)) : 0;
      const textScore = textWeight * normalizedBM25;

      if (combinedResults.has(result.id)) {
        const existing = combinedResults.get(result.id);
        existing.score += textScore;
        existing.textRank = index + 1;
        existing.bm25Score = result.bm25_score;
      } else {
        combinedResults.set(result.id, { ...result, score: textScore, textRank: index + 1, bm25Score: result.bm25_score });
      }
    });
  }

  return Array.from(combinedResults.values()).sort((a, b) => b.score - a.score);
}

/**
 * Hybrid search combining Jina v3 vector similarity and text search with RRF
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
    vectorWeight = 0.5,
    textWeight = 0.5,
    vectorTask = 'retrieval.query'
  } = options;

  const startTime = Date.now();

  try {
    const searchPromises: Promise<any[]>[] = [];

    if (vectorWeight > 0) {
      searchPromises.push(
        searchTabsByVector(query, userId, Math.floor(Math.min(limit * 1.5, 30)), vectorTask)
          .catch(error => {
            logger.warn('Vector search failed, continuing with text search only:', error);
            return [];
          })
      );
    }

    if (textWeight > 0) {
      searchPromises.push(
        searchTabsByText(query, userId, Math.floor(Math.min(limit * 1.5, 30)))
          .catch(error => {
            logger.warn('Text search failed, continuing with vector search only:', error);
            return [];
          })
      );
    }

    if (searchPromises.length === 0) {
      logger.debug('No suitable search methods for query, using fallback');
      return await getFallbackResults(query, userId, limit);
    }

    // Execute the search promises in parallel
    const results = await Promise.all(searchPromises);
    const vectorResults = vectorWeight > 0 ? results[0] || [] : [];
    const textResults = textWeight > 0 ? results[vectorWeight > 0 ? 1 : 0] || [] : [];

    if (vectorResults.length === 0 && textResults.length > 0) {
      return textResults.slice(0, limit);
    }

    if (textResults.length === 0 && vectorResults.length > 0) {
      return vectorResults.slice(0, limit);
    }

    let finalResults = reciprocalRankFusion([vectorResults, textResults]).slice(0, limit);

    if (finalResults.length === 0) {
      finalResults = legacyRank(vectorResults, textResults, vectorWeight, textWeight).slice(0, limit);
    }

    const searchTime = Date.now() - startTime;

    logger.info(`Hybrid search returned ${finalResults.length} results in ${searchTime}ms (vector: ${vectorResults.length}, text: ${textResults.length})`);

    return finalResults;
  } catch (error) {
    logger.error('Error in Jina v3 hybrid search:', error);
    return await getFallbackResults(query, userId, limit);
  }
}
