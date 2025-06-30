import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { tabs, tags, tabTags } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { hybridSearch } from '@/services/searchService';
import { getCurrentUserId as getUser } from '@/utils/get-current-user';

// Simple session management (replace with proper auth later)
function getCurrentUserId(request: Request): string {
  return getUser(request);
}

/**
 * GET /api/tabs/search - Search tabs using hybrid search (vector + text)
 */
export async function GET(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    // Parse search weight from slider (0 = keyword, 1 = hybrid, 2 = semantic)
    const searchWeight = parseFloat(url.searchParams.get('weight') || '1.0');
    
    // Convert slider value to vector/text weights
    let vectorWeight: number;
    let textWeight: number;
    
    if (searchWeight <= 1) {
      // 0-1: keyword to hybrid (text weight decreases, vector weight increases)
      textWeight = 1 - searchWeight;
      vectorWeight = searchWeight;
    } else {
      // 1-2: hybrid to semantic (text weight decreases to 0, vector weight stays high)
      textWeight = Math.max(0, 2 - searchWeight);
      vectorWeight = 1;
    }
    
    // Normalize weights to sum to 1
    const totalWeight = vectorWeight + textWeight;
    if (totalWeight > 0) {
      vectorWeight = vectorWeight / totalWeight;
      textWeight = textWeight / totalWeight;
    }
    
    // Also support direct weight parameters for backward compatibility
    const directVectorWeight = url.searchParams.get('vectorWeight');
    const directTextWeight = url.searchParams.get('textWeight');
    if (directVectorWeight && directTextWeight) {
      vectorWeight = parseFloat(directVectorWeight);
      textWeight = parseFloat(directTextWeight);
    }
    
    logger.info(`Search API called with userId: ${userId}, query: "${query}"`);
    
    if (!query.trim()) {
      logger.info('Empty query, returning empty results');
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
