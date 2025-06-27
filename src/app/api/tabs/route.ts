import { NextResponse } from 'next/server';
import { db, generateId } from '@/db/client';
import { tabs, folders, tags, tabTags, suggestedFolders } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { updateTabEmbedding } from '@/services/jinaEmbeddingService';
import { ensureUserExists } from '@/utils/ensure-user';
import { captureScreenshots } from '@/services/screenshotService';

// Simple session management (replace with proper auth later)
async function getCurrentUserId(): Promise<string> {
  const userId = 'user_001';
  await ensureUserExists(userId);
  return userId;
}

/**
 * GET /api/tabs - Get all tabs for the current user
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    
    // Get all tabs for the user
    const userTabs = await db
      .select()
      .from(tabs)
      .where(eq(tabs.userId, userId))
      .orderBy(desc(tabs.dateAdded));
    
    if (userTabs.length === 0) {
      return NextResponse.json([]);
    }
    
    const tabIds = userTabs.map(tab => tab.id);
    
    // Get all tab tags
    const tabTagsData = await db
      .select({
        tabId: tabTags.tabId,
        tagName: tags.name
      })
      .from(tabTags)
      .innerJoin(tags, eq(tabTags.tagId, tags.id))
      .where(inArray(tabTags.tabId, tabIds));
    
    // Get suggested folders
    const suggestedFoldersData = await db
      .select()
      .from(suggestedFolders)
      .where(inArray(suggestedFolders.tabId, tabIds));
    
    // Transform to match frontend Tab interface
    const transformedTabs = userTabs.map(tab => {
      const tabTagsList = tabTagsData
        .filter(tt => tt.tabId === tab.id)
        .map(tt => tt.tagName);
      
      const suggestedFoldersList = suggestedFoldersData
        .filter(sf => sf.tabId === tab.id)
        .map(sf => sf.folderId);
      
      return {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        domain: tab.domain || '',
        dateAdded: tab.dateAdded || new Date().toISOString(),
        summary: tab.summary || '',
        category: tab.category || 'uncategorized',
        screenshot: tab.screenshotUrl,
        fullScreenshot: tab.fullScreenshotUrl || undefined,
        status: tab.status || 'unprocessed',
        tags: tabTagsList,
        folderId: tab.folderId,
        suggestedFolders: suggestedFoldersList
      };
    });
    
    return NextResponse.json(transformedTabs);
  } catch (error) {
    logger.error('Error in GET tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tabs - Create or update tab
 */
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const tabData = await request.json();
    
    // Ensure tab has an ID
    const tabId = tabData.id || generateId();
    
    // Convert from frontend Tab interface to database record
    const tabRecord = {
      id: tabId,
      userId: userId,
      folderId: tabData.folderId || null,
      title: tabData.title.substring(0, 255),
      url: tabData.url.substring(0, 2048),
      domain: tabData.domain || '',
      dateAdded: tabData.dateAdded || new Date().toISOString(),
      summary: tabData.summary || '',
      category: tabData.category || 'uncategorized',
      screenshotUrl: tabData.screenshot || null,
      fullScreenshotUrl: tabData.fullScreenshot || null,
      status: tabData.status || 'unprocessed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Insert or update the tab
    await db
      .insert(tabs)
      .values(tabRecord)
      .onConflictDoUpdate({
        target: tabs.id,
        set: {
          folderId: tabRecord.folderId,
          title: tabRecord.title,
          url: tabRecord.url,
          domain: tabRecord.domain,
          summary: tabRecord.summary,
          category: tabRecord.category,
          screenshotUrl: tabRecord.screenshotUrl,
          fullScreenshotUrl: tabRecord.fullScreenshotUrl,
          status: tabRecord.status,
          updatedAt: new Date().toISOString()
        }
      });

    // Generate embedding in background (don't wait for it)
    if (tabRecord.title || tabRecord.summary) {
      const embeddingText = `${tabRecord.title} ${tabRecord.summary || ''}`.trim();
      updateTabEmbedding(tabId, embeddingText, 'retrieval.passage').catch(error => {
        logger.warn(`Failed to generate Jina embedding for tab ${tabId}:`, error);
      });
    }

    // Generate screenshots in background if not already provided
    if (!tabRecord.screenshotUrl && tabRecord.url) {
      captureScreenshots(tabRecord.url).then(async ({ thumbnail, fullHeight }) => {
        if (thumbnail || fullHeight) {
          // Update the tab record with the screenshot URLs
          await db
            .update(tabs)
            .set({ 
              screenshotUrl: thumbnail,
              fullScreenshotUrl: fullHeight,
              updatedAt: new Date().toISOString()
            })
            .where(eq(tabs.id, tabId));
          
          logger.info(`Screenshots generated and saved for tab ${tabId}: thumbnail=${thumbnail}, full=${fullHeight}`);
        }
      }).catch(error => {
        logger.warn(`Failed to generate screenshots for tab ${tabId}:`, error);
      });
    }
    
    // Handle tags if present
    if (tabData.tags && tabData.tags.length > 0) {
      // First, ensure all tags exist
      for (const tagName of tabData.tags) {
        await db
          .insert(tags)
          .values({
            id: generateId(),
            userId: userId,
            name: tagName,
            createdAt: new Date().toISOString()
          })
          .onConflictDoNothing();
      }
      
      // Get tag IDs
      const tagRecords = await db
        .select()
        .from(tags)
        .where(and(
          eq(tags.userId, userId),
          inArray(tags.name, tabData.tags)
        ));
      
      // Delete existing tab_tags
      await db
        .delete(tabTags)
        .where(eq(tabTags.tabId, tabId));
      
      // Insert new tab_tags
      if (tagRecords.length > 0) {
        const tabTagRecords = tagRecords.map(tag => ({
          tabId: tabId,
          tagId: tag.id
        }));
        
        await db
          .insert(tabTags)
          .values(tabTagRecords);
      }
    }
    
    // Handle suggested folders if present
    if (tabData.suggestedFolders && tabData.suggestedFolders.length > 0) {
      // Delete existing suggested folders
      await db
        .delete(suggestedFolders)
        .where(eq(suggestedFolders.tabId, tabId));
      
      // Insert new suggested folders
      const suggestedFolderRecords = tabData.suggestedFolders.map((folderId: string) => ({
        tabId: tabId,
        folderId: folderId
      }));
      
      await db
        .insert(suggestedFolders)
        .values(suggestedFolderRecords);
    }
    
    return NextResponse.json({ success: true, id: tabId });
  } catch (error) {
    logger.error('Error in POST tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tabs - Delete a tab
 */
export async function DELETE(request: Request) {
  try {
    const userId = getCurrentUserId();
    const url = new URL(request.url);
    const tabId = url.searchParams.get('id');
    
    if (!tabId) {
      return NextResponse.json({ error: 'Tab ID required' }, { status: 400 });
    }
    
    // Delete related records first (foreign key constraints)
    await db.delete(tabTags).where(eq(tabTags.tabId, tabId));
    await db.delete(suggestedFolders).where(eq(suggestedFolders.tabId, tabId));
    
    // Delete the tab (ensure it belongs to the user)
    await db
      .delete(tabs)
      .where(and(
        eq(tabs.id, tabId),
        eq(tabs.userId, userId)
      ));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
