import { NextResponse } from 'next/server';
import { db, client, generateId } from '@/db/client';
import { tabs } from '@/db/schema';
import { logger } from '@/utils/logger';
import { getCurrentUserId } from '@/utils/get-current-user';
import { ensureUserExists } from '@/utils/ensure-user';

interface BatchTabInput {
  id?: string;
  title: string;
  url: string;
  domain?: string;
  dateAdded?: string;
  summary?: string;
  category?: string;
  tags?: string[];
  status?: 'unprocessed' | 'kept' | 'discarded';
  folderId?: string;
}

interface BatchResult {
  successful: Array<{ id: string; url: string }>;
  failed: Array<{ url: string; error: string; index: number }>;
  total: number;
  importBatchId: string;
}

/**
 * POST /api/tabs/batch - Import multiple tabs at once
 * 
 * This endpoint:
 * 1. Accepts an array of tabs to import
 * 2. Validates and processes them in a transaction
 * 3. Returns detailed results for each tab
 * 4. Handles errors gracefully without losing data
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  let userId: string;
  
  try {
    // Get and validate user
    userId = await getCurrentUserId(request);
    await ensureUserExists(userId);
    
    const body = await request.json();
    const { tabs: inputTabs, skipDuplicates = false } = body as { 
      tabs: BatchTabInput[]; 
      skipDuplicates?: boolean;
    };
    
    if (!Array.isArray(inputTabs) || inputTabs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: tabs array is required' },
        { status: 400 }
      );
    }
    
    logger.info(`Batch import started for user ${userId}: ${inputTabs.length} tabs`);
    
    // Generate a unique batch ID for this import
    const importBatchId = generateId();
    
    const result: BatchResult = {
      successful: [],
      failed: [],
      total: inputTabs.length,
      importBatchId
    };
    
    // Process tabs in smaller batches to avoid timeout
    const BATCH_SIZE = 50;
    const batches = [];
    
    for (let i = 0; i < inputTabs.length; i += BATCH_SIZE) {
      batches.push(inputTabs.slice(i, i + BATCH_SIZE));
    }
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * BATCH_SIZE;
      
      try {
        // Use a transaction for each batch
        await db.transaction(async (tx) => {
          for (let i = 0; i < batch.length; i++) {
            const tabInput = batch[i];
            const globalIndex = batchStartIndex + i;
            
            try {
              // Validate URL
              let validatedUrl: string;
              try {
                const urlObj = new URL(tabInput.url);
                validatedUrl = urlObj.toString();
              } catch {
                // Try adding https:// if missing
                if (!tabInput.url.startsWith('http')) {
                  validatedUrl = `https://${tabInput.url}`;
                  new URL(validatedUrl); // Validate again
                } else {
                  throw new Error('Invalid URL format');
                }
              }
              
              // Extract domain if not provided
              const domain = tabInput.domain || new URL(validatedUrl).hostname.replace('www.', '');
              
              // Create tab record
              const tabId = tabInput.id || generateId();
              const now = new Date().toISOString();
              
              const tabRecord = {
                id: tabId,
                userId,
                folderId: tabInput.folderId || null,
                title: (tabInput.title || domain).substring(0, 255),
                url: validatedUrl.substring(0, 2048),
                domain: domain.substring(0, 255),
                dateAdded: tabInput.dateAdded || now,
                summary: tabInput.summary || '',
                category: tabInput.category || 'uncategorized',
                status: tabInput.status || 'unprocessed',
                // Mark as pending import for background processing
                content: JSON.stringify({ 
                  importBatchId, 
                  importStatus: 'pending',
                  importedAt: now 
                }),
                createdAt: now,
                updatedAt: now
              };
              
              // Insert tab (within transaction)
              await tx.insert(tabs).values(tabRecord).onConflictDoUpdate({
                target: tabs.id,
                set: {
                  title: tabRecord.title,
                  domain: tabRecord.domain,
                  summary: tabRecord.summary,
                  category: tabRecord.category,
                  status: tabRecord.status,
                  updatedAt: now
                }
              });
              
              result.successful.push({ id: tabId, url: validatedUrl });
              
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              logger.error(`Failed to import tab at index ${globalIndex}:`, error);
              result.failed.push({
                url: tabInput.url,
                error: errorMessage,
                index: globalIndex
              });
            }
          }
        });
        
      } catch (transactionError) {
        // If the entire batch fails, mark all tabs in the batch as failed
        logger.error(`Batch ${batchIndex} transaction failed:`, transactionError);
        
        for (let i = 0; i < batch.length; i++) {
          const globalIndex = batchStartIndex + i;
          result.failed.push({
            url: batch[i].url,
            error: 'Batch transaction failed',
            index: globalIndex
          });
        }
      }
    }
    
    const duration = Date.now() - startTime;
    logger.info(`Batch import completed in ${duration}ms: ${result.successful.length} successful, ${result.failed.length} failed`);
    
    // Schedule background processing for successful tabs
    if (result.successful.length > 0) {
      // Fire and forget - don't await
      scheduleBackgroundProcessing(result.successful.map(t => t.id), userId, importBatchId)
        .catch(error => logger.error('Failed to schedule background processing:', error));
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Batch import error:', error);
    return NextResponse.json(
      { error: 'Internal server error during batch import' },
      { status: 500 }
    );
  }
}

/**
 * Schedule background processing for imported tabs
 * This includes screenshot capture, AI summarization, and embedding generation
 */
async function scheduleBackgroundProcessing(
  tabIds: string[], 
  userId: string, 
  importBatchId: string
): Promise<void> {
  // In a production environment, this would add jobs to a queue (e.g., BullMQ, AWS SQS)
  // For now, we'll trigger the processing API endpoint
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || '3000'}`;
    
    // Call the background processing endpoint
    await fetch(`${baseUrl}/api/tabs/process-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tabIds,
        userId,
        importBatchId,
        processType: 'full' // screenshots + AI + embeddings
      })
    });
    
    logger.info(`Scheduled background processing for ${tabIds.length} tabs in batch ${importBatchId}`);
  } catch (error) {
    logger.error('Failed to schedule background processing:', error);
    // Don't throw - this is a fire-and-forget operation
  }
}