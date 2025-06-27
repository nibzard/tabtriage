import { NextResponse } from 'next/server';
import { updateTabEmbedding, updateMissingEmbeddings } from '@/services/tursoEmbeddingService';
import { logger } from '@/utils/logger';

// Simple session management (replace with proper auth later)
function getCurrentUserId(): string {
  return 'user_001';
}

/**
 * POST /api/tabs/embeddings - Update embeddings for tabs
 */
export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId();
    const { tabId, text } = await request.json();
    
    if (tabId && text) {
      // Update single tab
      await updateTabEmbedding(tabId, text);
      return NextResponse.json({ success: true, message: 'Embedding updated' });
    } else {
      // Update all missing embeddings
      const updatedCount = await updateMissingEmbeddings(userId);
      return NextResponse.json({ 
        success: true, 
        message: `Updated ${updatedCount} embeddings` 
      });
    }
  } catch (error) {
    logger.error('Error updating embeddings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}