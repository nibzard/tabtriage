import { logger } from '@/utils/logger'
import { fileStorageService } from './fileStorageService'

// Function to capture both thumbnail and full-height screenshots of a webpage
export async function captureScreenshots(url: string): Promise<{ thumbnail: string | null, fullHeight: string | null }> {
  try {
    logger.debug(`Capturing screenshots for ${url}`)
    console.log(`DEBUG: Capturing screenshots for ${url}`)

    // Check if we're in a server environment
    if (typeof window === 'undefined') {
      // Server-side: use Playwright to capture real screenshots
      const { thumbnail: thumbnailBlob, fullHeight: fullHeightBlob } = await captureRealScreenshots(url)
      
      let thumbnailUrl: string | null = null
      let fullHeightUrl: string | null = null
      
      // Handle thumbnail
      if (thumbnailBlob) {
        logger.info(`Storing thumbnail using ${process.env.STORAGE_PROVIDER || 'uploadthing'} provider for ${url}`)
        console.log(`INFO: Storing thumbnail using ${process.env.STORAGE_PROVIDER || 'uploadthing'} provider for ${url}`)
        
        thumbnailUrl = await fileStorageService.storeScreenshot(thumbnailBlob, url, 'thumbnail')
        
        if (thumbnailUrl) {
          logger.info(`Successfully stored thumbnail: ${thumbnailUrl}`)
          console.log(`INFO: Successfully stored thumbnail: ${thumbnailUrl}`)
        } else {
          logger.warn(`Thumbnail storage failed, falling back to data URL for ${url}`)
          thumbnailUrl = await convertBlobToDataURL(thumbnailBlob)
        }
      }
      
      // Handle full-height screenshot
      if (fullHeightBlob) {
        logger.info(`Storing full-height screenshot using ${process.env.STORAGE_PROVIDER || 'uploadthing'} provider for ${url}`)
        console.log(`INFO: Storing full-height screenshot using ${process.env.STORAGE_PROVIDER || 'uploadthing'} provider for ${url}`)
        
        fullHeightUrl = await fileStorageService.storeScreenshot(fullHeightBlob, url, 'full')
        
        if (fullHeightUrl) {
          logger.info(`Successfully stored full-height screenshot: ${fullHeightUrl}`)
          console.log(`INFO: Successfully stored full-height screenshot: ${fullHeightUrl}`)
        } else {
          logger.warn(`Full-height storage failed, falling back to data URL for ${url}`)
          fullHeightUrl = await convertBlobToDataURL(fullHeightBlob)
        }
      }
      
      // If we couldn't capture real screenshots, fall back to placeholder
      if (!thumbnailBlob && !fullHeightBlob) {
        logger.warn(`Failed to capture real screenshots for ${url}, falling back to placeholder`)
        const placeholderBlob = await generateServerSidePlaceholder(url)
        if (placeholderBlob) {
          const placeholderUrl = await fileStorageService.storeScreenshot(placeholderBlob, url, 'thumbnail')
          thumbnailUrl = placeholderUrl || generateServerSideDataURL(url)
        } else {
          thumbnailUrl = generateServerSideDataURL(url)
        }
      }
      
      return { thumbnail: thumbnailUrl, fullHeight: fullHeightUrl }
    }

    // Client-side: generate placeholder image as before (real screenshots only work server-side)
    const placeholderImage = await generatePlaceholderImage(url)

    if (!placeholderImage) {
      logger.warn(`Failed to generate placeholder image for ${url}`)
      console.warn(`WARNING: Failed to generate placeholder image for ${url}`)
      return { thumbnail: null, fullHeight: null }
    }

    // Store using the unified file storage service
    logger.info(`Storing screenshot using ${process.env.STORAGE_PROVIDER || 'uploadthing'} provider for ${url}`)
    console.log(`INFO: Storing screenshot using ${process.env.STORAGE_PROVIDER || 'uploadthing'} provider for ${url}`)
    
    const storedUrl = await fileStorageService.storeScreenshot(placeholderImage, url, 'thumbnail')
    
    const thumbnailUrl = storedUrl || await convertBlobToDataURL(placeholderImage)
    
    if (storedUrl) {
      logger.info(`Successfully stored screenshot: ${storedUrl}`)
      console.log(`INFO: Successfully stored screenshot: ${storedUrl}`)
    } else {
      logger.warn(`Storage failed, falling back to data URL for ${url}`)
      console.warn(`WARNING: Storage failed, falling back to data URL for ${url}`)
    }
    
    return { thumbnail: thumbnailUrl, fullHeight: null }
  } catch (error) {
    logger.error(`Error capturing screenshots for ${url}:`, error)
    console.error(`ERROR capturing screenshots for ${url}:`, error)
    return { thumbnail: null, fullHeight: null }
  }
}

// Legacy function for backward compatibility
export async function captureScreenshot(url: string): Promise<string | null> {
  const { thumbnail } = await captureScreenshots(url)
  return thumbnail
}

// Capture both thumbnail and full-height screenshots using local Playwright via API
async function captureRealScreenshots(url: string): Promise<{ thumbnail: Blob | null, fullHeight: Blob | null }> {
  try {
    // Check if we're on server side
    if (typeof window === 'undefined') {
      // Server-side: use internal API route for Playwright screenshots
      logger.info(`Attempting local Playwright screenshots via API for ${url}`)
      
      try {
        // Use internal API route to avoid direct Playwright imports
        // Get the current port from the request or use default
        const port = process.env.PORT || '3000'
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`
        const response = await fetch(`${baseUrl}/api/screenshots`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            let thumbnail: Blob | null = null
            let fullHeight: Blob | null = null
            
            // Convert thumbnail data URL back to blob
            if (data.thumbnail) {
              const thumbnailBase64Data = data.thumbnail.split(',')[1]
              const thumbnailBuffer = Buffer.from(thumbnailBase64Data, 'base64')
              thumbnail = new Blob([thumbnailBuffer], { type: 'image/jpeg' })
              logger.info(`Successfully captured thumbnail for ${url} (${thumbnail.size} bytes)`)
            }
            
            // Convert full-height data URL back to blob
            if (data.fullHeight) {
              const fullHeightBase64Data = data.fullHeight.split(',')[1]
              const fullHeightBuffer = Buffer.from(fullHeightBase64Data, 'base64')
              fullHeight = new Blob([fullHeightBuffer], { type: 'image/jpeg' })
              logger.info(`Successfully captured full-height screenshot for ${url} (${fullHeight.size} bytes)`)
            }
            
            return { thumbnail, fullHeight }
          }
        }
      } catch (apiError) {
        logger.warn(`Playwright API screenshots failed for ${url}:`, apiError)
      }
    }

    logger.warn(`Screenshot capture failed for ${url}`)
    return { thumbnail: null, fullHeight: null }
  } catch (error) {
    logger.error(`Error capturing real screenshots for ${url}:`, error)
    console.error(`ERROR capturing real screenshots for ${url}:`, error)
    return { thumbnail: null, fullHeight: null }
  }
}

// Legacy function for backward compatibility
async function captureRealScreenshot(url: string): Promise<Blob | null> {
  const { thumbnail } = await captureRealScreenshots(url)
  return thumbnail
}

// Convert Blob to data URL
async function convertBlobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

// Generate a placeholder image for development
async function generatePlaceholderImage(url: string): Promise<Blob | null> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Server-side: generate a simple data URL
      return await generateServerSidePlaceholder(url)
    }

    // Client-side: Create a canvas element
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 800

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Failed to get canvas context')
      return null
    }

    // Extract domain from URL
    let domain = ''
    try {
      domain = new URL(url).hostname.replace('www.', '')
    } catch (e) {
      domain = 'example.com'
    }

    // Generate a gradient background based on the domain
    const hash = hashString(domain)
    const hue1 = hash % 360
    const hue2 = (hash * 1.5) % 360

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, `hsl(${hue1}, 70%, 80%)`)
    gradient.addColorStop(1, `hsl(${hue2}, 70%, 60%)`)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add favicon if available (simulated)
    try {
      // Draw a simple icon placeholder
      const iconSize = 64
      const iconX = canvas.width / 2 - iconSize / 2
      const iconY = canvas.height / 2 - iconSize - 40

      // Draw icon background
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw first letter of domain
      ctx.fillStyle = `hsl(${hue1}, 70%, 40%)`
      ctx.font = 'bold 36px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(domain.charAt(0).toUpperCase(), iconX + iconSize / 2, iconY + iconSize / 2)
    } catch (e) {
      logger.warn(`Error drawing favicon for ${domain}:`, e)
    }

    // Add domain text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(domain, canvas.width / 2, canvas.height / 2)

    // Add URL path
    try {
      const path = new URL(url).pathname
      if (path && path !== '/') {
        ctx.font = 'normal 24px Arial'
        ctx.fillText(path, canvas.width / 2, canvas.height / 2 + 60)
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    console.log(`DEBUG: Generated placeholder image for ${url}`)
    
    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log(`DEBUG: Generated blob size: ${blob.size} bytes for ${url}`)
        } else {
          console.warn(`WARNING: Failed to generate blob for ${url}`)
        }
        resolve(blob)
      }, 'image/jpeg', 0.9)
    })
  } catch (error) {
    logger.error('Error generating placeholder image:', error)
    console.error('ERROR generating placeholder image:', error)
    return null
  }
}

// Simple hash function for strings
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Server-side data URL generation
function generateServerSideDataURL(url: string): string {
  try {
    // Extract domain from URL
    let domain = ''
    try {
      domain = new URL(url).hostname.replace('www.', '')
    } catch (e) {
      domain = 'example.com'
    }

    // Generate colors based on domain
    const hash = hashString(domain)
    const hue1 = hash % 360
    const hue2 = (hash * 1.5) % 360

    // Create SVG with gradient background
    const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue1}, 70%, 80%)" />
          <stop offset="100%" style="stop-color:hsl(${hue2}, 70%, 60%)" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)" />
      <circle cx="600" cy="360" r="32" fill="white" />
      <text x="600" y="375" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="hsl(${hue1}, 70%, 40%)">${domain.charAt(0).toUpperCase()}</text>
      <text x="600" y="440" text-anchor="middle" font-family="Arial" font-size="48" font-weight="bold" fill="rgba(255, 255, 255, 0.9)">${domain}</text>
      ${new URL(url).pathname !== '/' ? `<text x="600" y="500" text-anchor="middle" font-family="Arial" font-size="24" fill="rgba(255, 255, 255, 0.9)">${new URL(url).pathname}</text>` : ''}
    </svg>`

    // Convert SVG to data URL
    const dataURL = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    
    logger.info(`Generated server-side data URL for ${url}`)
    console.log(`INFO: Generated server-side data URL for ${url}`)
    
    return dataURL
  } catch (error) {
    logger.error('Error generating server-side data URL:', error)
    console.error('ERROR generating server-side data URL:', error)
    return `data:image/svg+xml;base64,${Buffer.from('<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="600" y="400" text-anchor="middle" font-family="Arial" font-size="48" fill="#666">No Screenshot</text></svg>').toString('base64')}`
  }
}

// Server-side placeholder image generation using SVG blob
async function generateServerSidePlaceholder(url: string): Promise<Blob | null> {
  try {
    // Extract domain from URL
    let domain = ''
    try {
      domain = new URL(url).hostname.replace('www.', '')
    } catch (e) {
      domain = 'example.com'
    }

    // Generate colors based on domain
    const hash = hashString(domain)
    const hue1 = hash % 360
    const hue2 = (hash * 1.5) % 360

    // Create SVG with gradient background
    const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue1}, 70%, 80%)" />
          <stop offset="100%" style="stop-color:hsl(${hue2}, 70%, 60%)" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)" />
      <circle cx="600" cy="360" r="32" fill="white" />
      <text x="600" y="375" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="hsl(${hue1}, 70%, 40%)">${domain.charAt(0).toUpperCase()}</text>
      <text x="600" y="440" text-anchor="middle" font-family="Arial" font-size="48" font-weight="bold" fill="rgba(255, 255, 255, 0.9)">${domain}</text>
      ${new URL(url).pathname !== '/' ? `<text x="600" y="500" text-anchor="middle" font-family="Arial" font-size="24" fill="rgba(255, 255, 255, 0.9)">${new URL(url).pathname}</text>` : ''}
    </svg>`

    // Create a proper blob for Node.js environment
    const buffer = Buffer.from(svg, 'utf8')
    
    // Create a blob-like object that works with our upload services
    const blob = new Blob([buffer], { type: 'image/svg+xml' })
    
    logger.info(`Generated server-side blob for ${url}`)
    console.log(`INFO: Generated server-side blob for ${url}`)
    
    return blob
  } catch (error) {
    logger.error('Error generating server-side placeholder blob:', error)
    console.error('ERROR generating server-side placeholder blob:', error)
    return null
  }
}