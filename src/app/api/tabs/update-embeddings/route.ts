import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserId } from '@/utils/supabase-server';
import { logger } from '@/utils/logger';
import { processTabsWithoutEmbeddings } from '@/services/embeddingService';

/**
 * POST /api/tabs/update-embeddings - Process tabs without embeddings
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get limit from request body
    const { limit = 10 } = await request.json();
    
    logger.info(`Processing embeddings for up to ${limit} tabs for user ${userId}`);
    
    const processedCount = await processTabsWithoutEmbeddings(userId, limit);
    
    return NextResponse.json({ 
      success: true, 
      processedCount,
      message: `Successfully processed embeddings for ${processedCount} tabs`
    });
  } catch (error) {
    logger.error('Error in update-embeddings route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/tabs/update-embeddings - Get count of tabs without embeddings
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Count tabs without embeddings
    const { count, error } = await supabase
      .from('tabs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('embedding', null);
    
    if (error) {
      logger.error('Error getting embedding count:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      pendingCount: count || 0
    });
  } catch (error) {
    logger.error('Error in GET update-embeddings route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}