import { NextResponse } from 'next/server';
import { db, client, generateId } from '@/db/client';
import { tabs, folders, tags, tabTags, suggestedFolders } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { updateTabEmbedding, updateTabEmbeddingWithContent } from '@/services/jinaEmbeddingService';
import { ensureUserExists } from '@/utils/ensure-user';
import { captureScreenshots } from '@/services/screenshotService';
import { getCurrentUserId as getUser } from '@/utils/get-current-user';
import { deleteFilesByUrls } from '@/services/uploadthingService';

// Simple session management (replace with proper auth later)
async function getCurrentUserId(request?: Request): Promise<string> {
  const userId = getUser(request);
  await ensureUserExists(userId);
  return userId;
}

/**
 * GET /api/tabs - Get all tabs for the current user
 */
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request);
    logger.info(`GET tabs for user: ${userId}`);
    
    // Get all tabs for the user using raw SQL to avoid Drizzle schema issues
    const userTabsResult = await client.execute({
      sql: `SELECT * FROM tabs WHERE user_id = ? ORDER BY date_added DESC`,
      args: [userId]
    });
    
    const userTabs = userTabsResult.rows as any[];
    logger.info(`Found ${userTabs.length} tabs in database`);
    
    if (userTabs.length === 0) {
      return NextResponse.json([]);
    }
    
    const tabIds = userTabs.map(tab => tab.id);
    
    // For now, return simplified structure to test basic functionality
    const transformedTabs = userTabs.map(tab => {
      return {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        domain: tab.domain || '',
        dateAdded: tab.date_added || new Date().toISOString(),
        summary: tab.summary || '',
        category: tab.category || 'uncategorized',
        thumbnail: tab.thumbnail_url,
        screenshot: tab.screenshot_url,
        fullScreenshot: tab.full_screenshot_url || undefined,
        status: tab.status || 'unprocessed',
        tags: [], // Simplified for now
        folderId: tab.folder_id,
        suggestedFolders: [] // Simplified for now
      };
    });
    
    logger.info(`Retrieved ${transformedTabs.length} tabs for user ${userId}`);
    
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
    const userId = await getCurrentUserId(request);
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

    // Generate enhanced embedding with page content in background (don't wait for it)
    if (tabRecord.title || tabRecord.summary || tabRecord.url) {
      updateTabEmbeddingWithContent(
        tabId, 
        tabRecord.title || '', 
        tabRecord.summary || '', 
        tabRecord.url || '',
        'retrieval.passage'
      ).catch(error => {
        logger.warn(`Failed to generate enhanced Jina embedding for tab ${tabId}:`, error);
      });
    }

    // Generate screenshots in background if not already provided
    if (!tabRecord.screenshotUrl && tabRecord.url) {
      captureScreenshots(tabRecord.url).then(async ({ thumbnail, preview, fullHeight }) => {
        if (thumbnail || preview || fullHeight) {
          // Update the tab record with the screenshot URLs
          await db
            .update(tabs)
            .set({ 
              thumbnailUrl: thumbnail,
              screenshotUrl: preview,
              fullScreenshotUrl: fullHeight,
              updatedAt: new Date().toISOString()
            })
            .where(eq(tabs.id, tabId));
          
          logger.info(`Screenshots generated and saved for tab ${tabId}: thumbnail=${thumbnail}, preview=${preview}, full=${fullHeight}`);
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
    
    // First, get the tab to retrieve image URLs
    const tabToDelete = await db
      .select({
        thumbnailUrl: tabs.thumbnailUrl,
        screenshotUrl: tabs.screenshotUrl,
        fullScreenshotUrl: tabs.fullScreenshotUrl
      })
      .from(tabs)
      .where(and(
        eq(tabs.id, tabId),
        eq(tabs.userId, userId)
      ))
      .limit(1);
    
    if (tabToDelete.length === 0) {
      return NextResponse.json({ error: 'Tab not found' }, { status: 404 });
    }
    
    // Collect Uploadthing URLs for deletion
    const uploadthingUrls: string[] = [];
    const tab = tabToDelete[0];
    if (tab.thumbnailUrl?.includes('utfs.io')) {
      uploadthingUrls.push(tab.thumbnailUrl);
    }
    if (tab.screenshotUrl?.includes('utfs.io')) {
      uploadthingUrls.push(tab.screenshotUrl);
    }
    if (tab.fullScreenshotUrl?.includes('utfs.io')) {
      uploadthingUrls.push(tab.fullScreenshotUrl);
    }
    
    // Delete images from Uploadthing
    if (uploadthingUrls.length > 0) {
      try {
        await deleteFilesByUrls(uploadthingUrls);
        logger.info(`Deleted ${uploadthingUrls.length} images from Uploadthing for tab ${tabId}`);
      } catch (error) {
        logger.error(`Error deleting images for tab ${tabId}:`, error);
        // Continue with database deletion even if image deletion fails
      }
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
