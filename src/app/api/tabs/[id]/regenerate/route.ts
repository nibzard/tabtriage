import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { tabs } from '@/db/schema'
import { captureScreenshots } from '@/services/screenshotService'
import { updateTabEmbeddingWithContent } from '@/services/jinaEmbeddingService'
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

    // Step 1: Capture new screenshots
    logger.debug(`Capturing screenshots for ${tab.url}`)
    const screenshots = await captureScreenshots(tab.url)

    // Step 2: Extract content and generate new embeddings
    logger.debug(`Updating content and embeddings for ${tab.url}`)
    await updateTabEmbeddingWithContent(
      tabId, 
      tab.title || '', 
      tab.summary || '', 
      tab.url || '',
      'retrieval.passage'
    )

    // Step 3: Update the tab with new screenshots
    const [updatedTab] = await db
      .update(tabs)
      .set({
        thumbnailUrl: screenshots.thumbnail,
        screenshotUrl: screenshots.preview,
        fullScreenshotUrl: screenshots.fullHeight,
        updatedAt: new Date().toISOString(),
      })
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