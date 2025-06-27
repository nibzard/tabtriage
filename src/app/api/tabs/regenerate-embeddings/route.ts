import { NextResponse } from 'next/server';
import { updateMissingEmbeddings, getEmbeddingStats } from '@/services/jinaEmbeddingService';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    const userId = 'user_001'; // hardcoded for testing
    
    logger.info('Starting embedding regeneration process...');
    
    // Get current stats
    const beforeStats = await getEmbeddingStats(userId);
    logger.info(`Before: ${beforeStats.withEmbeddings}/${beforeStats.total} tabs have embeddings (${beforeStats.percentage}%)`);
    
    // Update missing embeddings
    const updatedCount = await updateMissingEmbeddings(userId, 10);
    
    // Get updated stats
    const afterStats = await getEmbeddingStats(userId);
    logger.info(`After: ${afterStats.withEmbeddings}/${afterStats.total} tabs have embeddings (${afterStats.percentage}%)`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} embeddings with Jina v3`,
      before: beforeStats,
      after: afterStats,
      updatedCount
    });
    
  } catch (error) {
    logger.error('Error regenerating embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate embeddings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}