import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { importBatches, tabs } from '@/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { getCurrentUserId } from '@/utils/get-current-user';

/**
 * GET /api/tabs/import-status?batchId=xxx - Get import status for a batch
 */
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId(request);
    const url = new URL(request.url);
    const batchId = url.searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId parameter is required' },
        { status: 400 }
      );
    }

    // Get batch information from import_batches table if it exists
    let batchInfo = null;
    try {
      const batchResult = await db
        .select()
        .from(importBatches)
        .where(and(
          eq(importBatches.id, batchId),
          eq(importBatches.userId, userId)
        ))
        .limit(1);
      
      batchInfo = batchResult[0] || null;
    } catch (error) {
      // Table might not exist yet, fall back to checking tabs content
      logger.warn('Import batches table not found, falling back to content field');
    }

    // Also check tabs with this batch ID in their content field
    const tabResults = await db
      .select({
        id: tabs.id,
        url: tabs.url,
        title: tabs.title,
        content: tabs.content,
        screenshotUrl: tabs.screenshotUrl,
        summary: tabs.summary,
        createdAt: tabs.createdAt
      })
      .from(tabs)
      .where(and(
        eq(tabs.userId, userId),
        sql`json_extract(${tabs.content}, '$.importBatchId') = ${batchId}`
      ));

    // Count tabs by processing status
    const statusCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    const tabDetails = tabResults.map(tab => {
      let importStatus = 'pending';
      let errors = null;
      
      try {
        if (tab.content) {
          const contentData = JSON.parse(tab.content);
          importStatus = contentData.importStatus || 'pending';
          errors = contentData.errors || null;
        }
      } catch {
        // Ignore JSON parse errors
      }

      // Determine status based on tab data
      if (tab.screenshotUrl && tab.summary) {
        importStatus = 'completed';
      } else if (importStatus === 'pending' && tab.createdAt) {
        importStatus = 'processing';
      }

      statusCounts[importStatus as keyof typeof statusCounts]++;

      return {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        status: importStatus,
        hasScreenshot: !!tab.screenshotUrl,
        hasSummary: !!tab.summary,
        errors
      };
    });

    const totalTabs = tabResults.length;
    const completedTabs = statusCounts.completed;
    const failedTabs = statusCounts.failed;
    const progress = totalTabs > 0 ? Math.round((completedTabs / totalTabs) * 100) : 0;

    // Determine overall status
    let overallStatus = 'pending';
    if (totalTabs === 0) {
      overallStatus = 'failed';
    } else if (completedTabs + failedTabs === totalTabs) {
      overallStatus = failedTabs === 0 ? 'completed' : 'failed';
    } else if (statusCounts.processing > 0 || statusCounts.pending < totalTabs) {
      overallStatus = 'processing';
    }

    const response = {
      batchId,
      status: overallStatus,
      totalTabs,
      completedTabs,
      failedTabs,
      progress,
      tabs: tabDetails,
      // Include batch info if available
      ...(batchInfo && {
        createdAt: batchInfo.createdAt,
        startedAt: batchInfo.startedAt,
        completedAt: batchInfo.completedAt,
        errors: batchInfo.errors ? JSON.parse(batchInfo.errors) : []
      })
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Import status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tabs/import-status - Create or update import batch status
 */
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId(request);
    const body = await request.json();
    
    const {
      batchId,
      status,
      totalTabs,
      successfulTabs = 0,
      failedTabs = 0,
      progress = 0,
      errors = []
    } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    
    // Try to create import_batches table if it doesn't exist
    try {
      await db.transaction(async (tx) => {
        // Insert or update batch status
        await tx.insert(importBatches).values({
          id: batchId,
          userId,
          status,
          totalTabs,
          successfulTabs,
          failedTabs,
          progress,
          errors: JSON.stringify(errors),
          startedAt: status === 'processing' ? now : undefined,
          completedAt: ['completed', 'failed'].includes(status) ? now : undefined,
          updatedAt: now,
          createdAt: now
        }).onConflictDoUpdate({
          target: importBatches.id,
          set: {
            status,
            successfulTabs,
            failedTabs,
            progress,
            errors: JSON.stringify(errors),
            startedAt: status === 'processing' ? now : sql`${importBatches.startedAt}`,
            completedAt: ['completed', 'failed'].includes(status) ? now : undefined,
            updatedAt: now
          }
        });
      });

      return NextResponse.json({ success: true });
      
    } catch (error) {
      logger.warn('Could not update import_batches table:', error);
      
      // Fall back to storing status in tab content fields
      const tabsWithBatch = await db
        .select({ id: tabs.id, content: tabs.content })
        .from(tabs)
        .where(and(
          eq(tabs.userId, userId),
          sql`json_extract(${tabs.content}, '$.importBatchId') = ${batchId}`
        ));

      for (const tab of tabsWithBatch) {
        try {
          let contentData = {};
          if (tab.content) {
            contentData = JSON.parse(tab.content);
          }

          contentData = {
            ...contentData,
            importStatus: status,
            batchProgress: progress,
            updatedAt: now
          };

          await db
            .update(tabs)
            .set({
              content: JSON.stringify(contentData),
              updatedAt: now
            })
            .where(eq(tabs.id, tab.id));
            
        } catch (updateError) {
          logger.error(`Failed to update tab ${tab.id} status:`, updateError);
        }
      }

      return NextResponse.json({ success: true, fallback: true });
    }

  } catch (error) {
    logger.error('Import status update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}