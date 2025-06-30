import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { tabs } from '@/db/schema'
import { eq, ne } from 'drizzle-orm'
import { captureScreenshots } from '@/services/screenshotService'
import { updateTabEmbeddingWithContent } from '@/services/jinaEmbeddingService'
import { logger } from '@/utils/logger'
import { ensureUserExists } from '@/utils/ensure-user'
import { getCurrentUserId as getUser } from '@/utils/get-current-user'

interface RegenerationProgress {
  total: number;
  processed: number;
  current?: string;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Get current user and ensure they exist
    const userId = getUser(request);
    await ensureUserExists(userId);
    
    logger.info(`Starting bulk regeneration for user: ${userId}`);

    // Get all tabs for the user (excluding discarded ones)
    const userTabs = await db
      .select()
      .from(tabs)
      .where(eq(tabs.userId, userId));

    if (userTabs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tabs found to regenerate',
        stats: {
          total: 0,
          processed: 0,
          errors: []
        }
      });
    }

    logger.info(`Found ${userTabs.length} tabs to regenerate`);

    const progress: RegenerationProgress = {
      total: userTabs.length,
      processed: 0,
      errors: []
    };

    const batchSize = 3; // Process in small batches to avoid overwhelming the system
    const results: any[] = [];

    // Process tabs in batches
    for (let i = 0; i < userTabs.length; i += batchSize) {
      const batch = userTabs.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(userTabs.length/batchSize)} (${batch.length} tabs)`);

      // Process batch in parallel
      const batchPromises = batch.map(async (tab) => {
        try {
          progress.current = tab.title || tab.url || tab.id;
          logger.debug(`Regenerating tab: ${tab.title || tab.url}`);

          // Step 1: Capture new screenshots
          let screenshots = null;
          try {
            screenshots = await captureScreenshots(tab.url || '');
            logger.debug(`Screenshots captured for tab ${tab.id}`);
          } catch (error) {
            logger.warn(`Screenshot capture failed for tab ${tab.id}:`, error);
            // Continue with content/embedding regeneration even if screenshots fail
          }

          // Step 2: Extract content and generate new embeddings
          try {
            await updateTabEmbeddingWithContent(
              tab.id, 
              tab.title || '', 
              tab.summary || '', 
              tab.url || '',
              'retrieval.passage'
            );
            logger.debug(`Content and embeddings updated for tab ${tab.id}`);
          } catch (error) {
            logger.warn(`Content/embedding update failed for tab ${tab.id}:`, error);
            progress.errors.push(`Content extraction failed for ${tab.title || tab.url}: ${error.message}`);
          }

          // Step 3: Update the tab with new screenshots (if successful)
          if (screenshots) {
            try {
              await db
                .update(tabs)
                .set({
                  thumbnailUrl: screenshots.thumbnail,
                  screenshotUrl: screenshots.preview,
                  fullScreenshotUrl: screenshots.fullHeight,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(tabs.id, tab.id));
              
              logger.debug(`Screenshots updated in database for tab ${tab.id}`);
            } catch (error) {
              logger.warn(`Screenshot database update failed for tab ${tab.id}:`, error);
              progress.errors.push(`Screenshot update failed for ${tab.title || tab.url}: ${error.message}`);
            }
          }

          progress.processed++;
          
          return {
            tabId: tab.id,
            title: tab.title,
            url: tab.url,
            success: true,
            screenshotsUpdated: !!screenshots,
            contentUpdated: true
          };
        } catch (error) {
          progress.processed++;
          progress.errors.push(`Failed to regenerate ${tab.title || tab.url}: ${error.message}`);
          logger.error(`Error regenerating tab ${tab.id}:`, error);
          
          return {
            tabId: tab.id,
            title: tab.title,
            url: tab.url,
            success: false,
            error: error.message
          };
        }
      });

      // Wait for all tabs in batch to be processed
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect API rate limits
      if (i + batchSize < userTabs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    logger.info(`Bulk regeneration completed: ${successCount} successful, ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Regeneration completed: ${successCount} successful, ${errorCount} failed`,
      stats: {
        total: userTabs.length,
        processed: progress.processed,
        successful: successCount,
        failed: errorCount,
        errors: progress.errors.slice(0, 10) // Return only first 10 errors to avoid response size issues
      },
      results: results.map(r => ({
        tabId: r.tabId,
        title: r.title,
        success: r.success,
        screenshotsUpdated: r.screenshotsUpdated,
        contentUpdated: r.contentUpdated
      }))
    });
  } catch (error) {
    logger.error('Error in bulk regeneration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to regenerate tabs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}