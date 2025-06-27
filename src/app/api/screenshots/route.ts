import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'

// Server-side only screenshot capture using Playwright
async function captureScreenshotsWithPlaywright(url: string): Promise<{ thumbnail: Buffer | null, fullHeight: Buffer | null }> {
  let browser = null
  try {
    logger.info(`Starting Playwright screenshot capture for ${url}`)
    
    // Import Playwright only on server side in this API route
    const { chromium } = await import('playwright')
    
    logger.info(`Launching Playwright browser for ${url}`)
    
    // Launch browser with Playwright
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set viewport
    await page.setViewportSize({
      width: 1200,
      height: 800
    })

    // Set timeout
    page.setDefaultTimeout(30000)

    // Navigate to the URL
    logger.info(`Navigating to ${url}`)
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    })

    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000)

    // Take thumbnail screenshot (viewport only)
    logger.info(`Taking thumbnail screenshot of ${url}`)
    const thumbnailBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      fullPage: false
    })
    
    // Take full-height screenshot
    logger.info(`Taking full-height screenshot of ${url}`)
    const fullHeightBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: true
    })
    
    logger.info(`Successfully captured both screenshots for ${url} (thumbnail: ${thumbnailBuffer.length} bytes, full: ${fullHeightBuffer.length} bytes)`)
    return { thumbnail: thumbnailBuffer, fullHeight: fullHeightBuffer }
  } catch (error) {
    logger.error(`Error capturing Playwright screenshots for ${url}:`, error)
    return { thumbnail: null, fullHeight: null }
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        logger.warn('Error closing Playwright browser:', closeError)
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const { thumbnail, fullHeight } = await captureScreenshotsWithPlaywright(url)
    
    if (thumbnail || fullHeight) {
      const response: any = { success: true }
      
      if (thumbnail) {
        const thumbnailBase64 = thumbnail.toString('base64')
        response.thumbnail = `data:image/jpeg;base64,${thumbnailBase64}`
        response.thumbnailSize = thumbnail.length
      }
      
      if (fullHeight) {
        const fullHeightBase64 = fullHeight.toString('base64')
        response.fullHeight = `data:image/jpeg;base64,${fullHeightBase64}`
        response.fullHeightSize = fullHeight.length
      }
      
      // Keep backward compatibility
      if (thumbnail) {
        response.screenshot = response.thumbnail
        response.size = response.thumbnailSize
      }
      
      return NextResponse.json(response)
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to capture screenshots' 
      })
    }
  } catch (error) {
    logger.error('Screenshot API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}