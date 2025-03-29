import { uploadScreenshot } from '@/utils/supabase'
import { logger } from '@/utils/logger'

// Function to capture a screenshot of a webpage
// In a real implementation, this would be done server-side
// For the MVP, we'll simulate it with a placeholder
export async function captureScreenshot(url: string): Promise<string | null> {
  try {
    logger.debug(`Generating screenshot for ${url}`)
    console.log(`DEBUG: Generating screenshot for ${url}`)

    // In a real implementation, we would use a service like Puppeteer or Playwright
    // to capture a screenshot of the webpage

    // For now, we'll generate a placeholder image
    const placeholderImage = await generatePlaceholderImage(url)

    if (!placeholderImage) {
      logger.warn(`Failed to generate placeholder image for ${url}`)
      console.warn(`WARNING: Failed to generate placeholder image for ${url}`)
      return null
    }

    // Create a unique filename based on the URL
    const urlHash = hashString(url).toString(16)
    const fileName = `${urlHash}-${Date.now()}.jpg`

    console.log(`DEBUG: Uploading screenshot for ${url} with filename ${fileName}`)
    
    // Upload the image to Supabase Storage
    const imageUrl = await uploadScreenshot(placeholderImage, fileName)

    if (imageUrl) {
      logger.debug(`Successfully uploaded screenshot for ${url}: ${imageUrl}`)
      console.log(`DEBUG: Successfully uploaded screenshot for ${url}: ${imageUrl}`)
    } else {
      logger.warn(`Failed to upload screenshot for ${url}`)
      console.warn(`WARNING: Failed to upload screenshot for ${url}`)
    }

    // If Supabase upload fails, use a data URL as fallback
    if (!imageUrl) {
      logger.info(`Using data URL fallback for ${url}`)
      console.log(`INFO: Using data URL fallback for ${url}`)
      return convertBlobToDataURL(placeholderImage)
    }

    return imageUrl
  } catch (error) {
    logger.error(`Error capturing screenshot for ${url}:`, error)
    console.error(`ERROR capturing screenshot for ${url}:`, error)
    return null
  }
}

// Convert Blob to data URL for fallback
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
    // Create a canvas element
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