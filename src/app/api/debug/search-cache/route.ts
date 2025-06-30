import { NextResponse } from 'next/server';
import { globalEmbeddingCache } from '@/services/embeddingCache';
import { logger } from '@/utils/logger';

/**
 * GET /api/debug/search-cache - Get embedding cache statistics and debug info
 */
export async function GET() {
  try {
    const stats = globalEmbeddingCache.getStats();
    const debug = globalEmbeddingCache.debug();
    
    const response = {
      stats,
      debug: debug.slice(0, 10), // Only show first 10 entries for readability
      timestamp: new Date().toISOString()
    };
    
    logger.info('Cache stats requested:', stats);
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/debug/search-cache - Clear the embedding cache
 */
export async function DELETE() {
  try {
    const statsBefore = globalEmbeddingCache.getStats();
    globalEmbeddingCache.clear();
    const statsAfter = globalEmbeddingCache.getStats();
    
    logger.info(`Cache cleared. Before: ${statsBefore.size} entries, After: ${statsAfter.size} entries`);
    
    return NextResponse.json({
      message: 'Cache cleared successfully',
      before: statsBefore,
      after: statsAfter,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}