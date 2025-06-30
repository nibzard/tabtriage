import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'

// Server-side only screenshot capture using Playwright
async function captureScreenshotsWithPlaywright(url: string): Promise<{ thumbnail: Buffer | null, preview: Buffer | null, fullHeight: Buffer | null }> {
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
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      })
    } catch (error) {
      logger.error(`Error navigating to ${url}:`, error);
      return { thumbnail: null, preview: null, fullHeight: null };
    }


    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000)

    // Take thumbnail screenshot (400x266) for workspace cards - doubled size for better visibility
    logger.info(`Taking thumbnail screenshot of ${url}`)
    await page.setViewportSize({ width: 1200, height: 800 })
    const fullSizeScreenshot = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      fullPage: false
    })
    
    // Resize to thumbnail using sharp if available, fallback to original
    let thumbnailBuffer: Buffer
    try {
      const sharp = require('sharp')
      thumbnailBuffer = await sharp(fullSizeScreenshot)
        .resize(400, 266, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 80 })
        .toBuffer()
      logger.info(`Resized thumbnail to 400x266 for ${url}`)
    } catch (error) {
      logger.warn(`Sharp not available, using full size as thumbnail for ${url}:`, error)
      thumbnailBuffer = fullSizeScreenshot
    }
    
    // Take preview screenshot (800x533) for modal preview
    logger.info(`Taking preview screenshot of ${url}`)
    let previewBuffer: Buffer
    try {
      const sharp = require('sharp')
      previewBuffer = await sharp(fullSizeScreenshot)
        .resize(800, 533, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 85 })
        .toBuffer()
      logger.info(`Resized preview to 800x533 for ${url}`)
    } catch (error) {
      logger.warn(`Sharp not available, using full size as preview for ${url}:`, error)
      previewBuffer = fullSizeScreenshot
    }
    
    // Take full-height screenshot
    logger.info(`Taking full-height screenshot of ${url}`)
    const fullHeightBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: true
    })
    
    logger.info(`Successfully captured all screenshots for ${url} (thumbnail: ${thumbnailBuffer.length} bytes, preview: ${previewBuffer.length} bytes, full: ${fullHeightBuffer.length} bytes)`)
    return { thumbnail: thumbnailBuffer, preview: previewBuffer, fullHeight: fullHeightBuffer }
  } catch (error) {
    logger.error(`Error capturing Playwright screenshots for ${url}:`, error)
    return { thumbnail: null, preview: null, fullHeight: null }
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

    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
    }

    const { thumbnail, preview, fullHeight } = await captureScreenshotsWithPlaywright(url)
    
    if (thumbnail || preview || fullHeight) {
      const response: any = { success: true }
      
      if (thumbnail) {
        const thumbnailBase64 = thumbnail.toString('base64')
        response.thumbnail = `data:image/jpeg;base64,${thumbnailBase64}`
        response.thumbnailSize = thumbnail.length
      }
      
      if (preview) {
        const previewBase64 = preview.toString('base64')
        response.preview = `data:image/jpeg;base64,${previewBase64}`
        response.previewSize = preview.length
      }
      
      if (fullHeight) {
        const fullHeightBase64 = fullHeight.toString('base64')
        response.fullHeight = `data:image/jpeg;base64,${fullHeightBase64}`
        response.fullHeightSize = fullHeight.length
      }
      
      // Keep backward compatibility - use preview as main screenshot
      if (preview) {
        response.screenshot = response.preview
        response.size = response.previewSize
      } else if (thumbnail) {
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