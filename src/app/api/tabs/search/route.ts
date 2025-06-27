import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { tabs, tags, tabTags } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { hybridSearch } from '@/services/jinaEmbeddingService';

// Simple session management (replace with proper auth later)
function getCurrentUserId(): string {
  return 'user_001';
}

/**
 * GET /api/tabs/search - Search tabs using hybrid search (vector + text)
 */
export async function GET(request: Request) {
  try {
    const userId = getCurrentUserId();
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const vectorWeight = parseFloat(url.searchParams.get('vectorWeight') || '0.7');
    const textWeight = parseFloat(url.searchParams.get('textWeight') || '0.3');
    
    if (!query.trim()) {
      return NextResponse.json([]);
    }
    
    logger.info(`Searching tabs for "${query}" with userId: ${userId}`);
    
    // Use hybrid search combining vector and text search
    const searchResults = await hybridSearch(query, userId, {
      limit,
      vectorWeight,
      textWeight
    });
    
    // Get tags for the results
    if (searchResults.length > 0) {
      const tabIds = searchResults.map(tab => tab.id);
      
      const tabTagsData = await db
        .select({
          tabId: tabTags.tabId,
          tagName: tags.name
        })
        .from(tabTags)
        .innerJoin(tags, eq(tabTags.tagId, tags.id))
        .where(inArray(tabTags.tabId, tabIds));
      
      // Transform to match frontend interface
      const transformedResults = searchResults.map(tab => {
        const tabTagsList = tabTagsData
          .filter(tt => tt.tabId === tab.id)
          .map(tt => tt.tagName);
        
        return {
          id: tab.id,
          title: tab.title,
          url: tab.url,
          domain: tab.domain || '',
          dateAdded: tab.date_added || tab.dateAdded || new Date().toISOString(),
          summary: tab.summary || '',
          category: tab.category || 'uncategorized',
          screenshot: tab.screenshot_url || tab.screenshotUrl,
          status: tab.status || 'unprocessed',
          tags: tabTagsList,
          folderId: tab.folder_id || tab.folderId,
          suggestedFolders: [],
          score: tab.score // Include relevance score
        };
      });
      
      logger.info(`Found ${transformedResults.length} search results`);
      return NextResponse.json(transformedResults);
    }
    
    return NextResponse.json([]);
  } catch (error) {
    logger.error('Error in tabs search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}