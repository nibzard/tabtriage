import { NextResponse } from 'next/server';
import { db, client } from '@/db/client';
import { tabs } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { captureScreenshots } from '@/services/screenshotService';
import { extractPageContent } from '@/services/contentExtractionService';
import { generateSummaryWithAI } from '@/services/openaiService';
import { categorizeTabWithAI } from '@/services/aiCategorizationService';
import { updateTabEmbeddingWithContent } from '@/services/jinaEmbeddingService';
import { TabImportRetryService } from '@/services/retryService';

interface ProcessBatchRequest {
  tabIds: string[];
  userId: string;
  importBatchId: string;
  processType: 'screenshots' | 'ai' | 'embeddings' | 'full';
}

interface ProcessResult {
  tabId: string;
  status: 'success' | 'failed';
  error?: string;
  updates?: {
    screenshots?: boolean;
    ai?: boolean;
    embeddings?: boolean;
  };
}

/**
 * POST /api/tabs/process-batch - Process imported tabs in the background
 * 
 * This endpoint handles:
 * 1. Screenshot capture (thumbnail, preview, full-height)
 * 2. AI content analysis (summary, categorization, tags)
 * 3. Embedding generation for search
 */
export async function POST(request: Request) {
  try {
    const body: ProcessBatchRequest = await request.json();
    const { tabIds, userId, importBatchId, processType = 'full' } = body;
    
    if (!tabIds || !Array.isArray(tabIds) || tabIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tabIds array' },
        { status: 400 }
      );
    }
    
    logger.info(`Processing batch ${importBatchId}: ${tabIds.length} tabs, type: ${processType}`);
    
    // Fetch tabs from database
    const tabsToProcess = await db
      .select()
      .from(tabs)
      .where(and(
        eq(tabs.userId, userId),
        inArray(tabs.id, tabIds)
      ));
    
    if (tabsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No tabs found to process' },
        { status: 404 }
      );
    }
    
    const results: ProcessResult[] = [];
    
    // Process tabs in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 5;
    const chunks = [];
    
    for (let i = 0; i < tabsToProcess.length; i += CONCURRENCY_LIMIT) {
      chunks.push(tabsToProcess.slice(i, i + CONCURRENCY_LIMIT));
    }
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (tab) => {
        const result: ProcessResult = {
          tabId: tab.id,
          status: 'success',
          updates: {}
        };
        
        try {
          const updates: any = {};
          
          // Step 1: Capture screenshots
          if (processType === 'screenshots' || processType === 'full') {
            try {
              logger.debug(`Capturing screenshots for tab ${tab.id}: ${tab.url}`);
              const { thumbnail, preview, fullHeight } = await TabImportRetryService.retryScreenshot(
                tab.url,
                (url) => captureScreenshots(url)
              );
              
              if (thumbnail || preview || fullHeight) {
                updates.thumbnailUrl = thumbnail;
                updates.screenshotUrl = preview;
                updates.fullScreenshotUrl = fullHeight;
                result.updates!.screenshots = true;
                logger.info(`Screenshots captured for tab ${tab.id}`);
              }
            } catch (error) {
              logger.warn(`Screenshot capture failed for tab ${tab.id}:`, error);
              // Continue processing even if screenshots fail
            }
          }
          
          // Step 2: AI processing (summary, categorization, tags)
          if (processType === 'ai' || processType === 'full') {
            try {
              logger.debug(`Extracting content for tab ${tab.id}: ${tab.url}`);
              const extractedContent = await extractPageContent(tab.url);
              
              if (extractedContent) {
                // Update the title with the extracted page title if available
                if (extractedContent.title && extractedContent.title.trim()) {
                  updates.title = extractedContent.title.substring(0, 255);
                  logger.info(`Updated title for tab ${tab.id}: ${extractedContent.title}`);
                }
                
                // Generate AI summary and tags with retry
                const { summary, tags: generatedTags } = await TabImportRetryService.retryAI(
                  () => generateSummaryWithAI(tab.url, extractedContent.content)
                );
                
                // Categorize the tab with retry
                const category = await TabImportRetryService.retryAI(
                  () => categorizeTabWithAI(tab.url, extractedContent.content)
                );
                
                updates.summary = summary;
                updates.category = category;
                updates.content = extractedContent.content.substring(0, 10000); // Store first 10k chars
                result.updates!.ai = true;
                
                logger.info(`AI processing completed for tab ${tab.id}`);
              }
            } catch (error) {
              logger.warn(`AI processing failed for tab ${tab.id}:`, error);
              // Continue processing even if AI fails
            }
          }
          
          // Step 3: Generate embeddings
          if (processType === 'embeddings' || processType === 'full') {
            try {
              await updateTabEmbeddingWithContent(
                tab.id,
                updates.title || tab.title || '',
                updates.summary || tab.summary || '',
                tab.url,
                'retrieval.passage'
              );
              result.updates!.embeddings = true;
              logger.info(`Embeddings generated for tab ${tab.id}`);
            } catch (error) {
              logger.warn(`Embedding generation failed for tab ${tab.id}:`, error);
              // Continue processing even if embeddings fail
            }
          }
          
          // Update the tab with all collected data
          if (Object.keys(updates).length > 0) {
            // Update import status in content field
            let contentData = {};
            try {
              contentData = tab.content ? JSON.parse(tab.content) : {};
            } catch {}
            
            contentData = {
              ...contentData,
              importStatus: 'completed',
              processedAt: new Date().toISOString()
            };
            
            updates.content = JSON.stringify(contentData);
            updates.updatedAt = new Date().toISOString();
            
            await db
              .update(tabs)
              .set(updates)
              .where(eq(tabs.id, tab.id));
          }
          
        } catch (error) {
          logger.error(`Failed to process tab ${tab.id}:`, error);
          result.status = 'failed';
          result.error = error instanceof Error ? error.message : 'Unknown error';
        }
        
        return result;
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    logger.info(`Batch processing completed: ${successCount} successful, ${failedCount} failed`);
    
    return NextResponse.json({
      importBatchId,
      processed: results.length,
      successful: successCount,
      failed: failedCount,
      results
    });
    
  } catch (error) {
    logger.error('Batch processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error during batch processing' },
      { status: 500 }
    );
  }
}