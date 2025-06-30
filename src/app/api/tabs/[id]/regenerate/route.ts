import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tabs } from '@/db/schema'
import { captureScreenshots } from '@/services/screenshotService'
import { updateTabEmbeddingWithContent } from '@/services/jinaEmbeddingService'
import { extractPageContent } from '@/services/contentExtractionService'
import { generateSummaryWithAI } from '@/services/openaiService'
import { categorizeTabWithAI } from '@/services/aiCategorizationService'
import { logger } from '@/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tabId } = await params
    
    if (!tabId) {
      return NextResponse.json(
        { error: 'Invalid tab ID' },
        { status: 400 }
      )
    }

    // Get the tab
    const [tab] = await db
      .select()
      .from(tabs)
      .where(eq(tabs.id, tabId))
      .limit(1)

    if (!tab) {
      return NextResponse.json(
        { error: 'Tab not found' },
        { status: 404 }
      )
    }

    logger.info(`Regenerating tab data for ${tabId}: ${tab.url}`)

    const updates: any = {}

    // Step 1: Extract fresh content and title
    logger.debug(`Extracting content for ${tab.url}`)
    const extractedContent = await extractPageContent(tab.url)
    
    if (extractedContent) {
      // Update title if we extracted one
      if (extractedContent.title && extractedContent.title.trim()) {
        updates.title = extractedContent.title.substring(0, 255)
        logger.info(`Updated title for tab ${tabId}: ${extractedContent.title}`)
      }

      // Regenerate AI summary and category
      const { summary } = await generateSummaryWithAI(tab.url, extractedContent.content)
      const category = await categorizeTabWithAI(tab.url, extractedContent.content)

      updates.summary = summary
      updates.category = category
      updates.content = extractedContent.content.substring(0, 10000)
    }

    // Step 2: Capture new screenshots
    logger.debug(`Capturing screenshots for ${tab.url}`)
    const screenshots = await captureScreenshots(tab.url)
    
    updates.thumbnailUrl = screenshots.thumbnail
    updates.screenshotUrl = screenshots.preview
    updates.fullScreenshotUrl = screenshots.fullHeight
    updates.updatedAt = new Date().toISOString()

    // Step 3: Generate new embeddings with updated title
    logger.debug(`Updating embeddings for ${tab.url}`)
    await updateTabEmbeddingWithContent(
      tabId, 
      updates.title || tab.title || '', 
      updates.summary || tab.summary || '', 
      tab.url || '',
      'retrieval.passage'
    )

    // Step 4: Update the tab with all new data
    const [updatedTab] = await db
      .update(tabs)
      .set(updates)
      .where(eq(tabs.id, tabId))
      .returning()

    logger.info(`Successfully regenerated tab data for ${tabId}`)

    return NextResponse.json({
      success: true,
      tab: updatedTab,
      screenshots: {
        thumbnail: screenshots.thumbnail,
        preview: screenshots.preview,
        fullHeight: screenshots.fullHeight,
      },
    })
  } catch (error) {
    logger.error('Error regenerating tab data:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate tab data' },
      { status: 500 }
    )
  }
}