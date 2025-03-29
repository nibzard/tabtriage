import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserId } from '@/utils/supabase-server';
import { logger } from '@/utils/logger';
import { searchTabs } from '@/services/embeddingService';

/**
 * GET /api/tabs/search - Search tabs using hybrid search
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 20;
    const fullTextWeight = searchParams.get('fullTextWeight') ? parseFloat(searchParams.get('fullTextWeight') as string) : 1.0;
    const semanticWeight = searchParams.get('semanticWeight') ? parseFloat(searchParams.get('semanticWeight') as string) : 1.0;
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    logger.info(`Searching tabs for "${query}" with userId: ${userId}`);
    
    try {
      const results = await searchTabs(query, userId, {
        limit,
        fullTextWeight,
        semanticWeight
      });
      
      // Determine if this was a hybrid or keyword search
      // Check if embeddings are enabled in the database
      const { error: vectorExtError } = await supabase.rpc('check_vector_extension');
      const hasVectorExtension = !vectorExtError;
      
      // Set the search mode header
      const response = NextResponse.json({
        results,
        searchMode: hasVectorExtension ? 'hybrid' : 'keyword',
        count: results.length
      });
      
      response.headers.set('X-Search-Mode', hasVectorExtension ? 'hybrid' : 'keyword');
      return response;
    } catch (searchError) {
      logger.error('Error in searchTabs:', searchError);
      
      // Fall back to basic text search
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'discarded')
        .textSearch(
          'title, summary, category',
          query,
          { config: 'english' }
        )
        .limit(limit);
      
      if (error) {
        logger.error('Error performing fallback text search:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }
      
      const response = NextResponse.json({
        results: data,
        searchMode: 'keyword',
        count: data.length
      });
      
      response.headers.set('X-Search-Mode', 'keyword');
      return response;
    }
  } catch (error) {
    logger.error('Error in search tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tabs/search - Search tabs with more complex criteria
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const requestData = await request.json();
    const { query, options = {} } = requestData;
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }
    
    logger.info(`Advanced search for "${query}" with options:`, options);
    
    const results = await searchTabs(query, userId, {
      limit: options.limit || 20,
      fullTextWeight: options.fullTextWeight || 1.0,
      semanticWeight: options.semanticWeight || 1.0
    });
    
    return NextResponse.json(results);
  } catch (error) {
    logger.error('Error in POST search tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}