import { logger } from '@/utils/logger'

// Function to fetch page content
export async function fetchPageContent(url: string): Promise<string | null> {
  try {
    logger.debug(`Fetching content for: ${url}`)

    // In a production environment, this would be a server-side function
    // For the MVP, we'll use a client-side fetch with CORS limitations
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch content for ${url}: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.contents) {
      logger.warn(`No content returned for ${url}`)
      return null
    }

    // Extract text content from HTML
    const textContent = extractTextFromHtml(data.contents)
    logger.debug(`Extracted ${textContent.length} characters of text from ${url}`)

    return textContent
  } catch (error) {
    logger.error(`Error fetching page content for ${url}:`, error)
    return null
  }
}

// Function to extract text content from HTML
function extractTextFromHtml(html: string): string {
  try {
    // Create a DOM parser
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Remove script and style elements
    const scripts = doc.getElementsByTagName('script')
    const styles = doc.getElementsByTagName('style')

    for (let i = scripts.length - 1; i >= 0; i--) {
      scripts[i].parentNode?.removeChild(scripts[i])
    }

    for (let i = styles.length - 1; i >= 0; i--) {
      styles[i].parentNode?.removeChild(styles[i])
    }

    // Get text from important elements
    const title = doc.querySelector('title')?.textContent || ''
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''

    // Get text from body
    const bodyText = doc.body.textContent || ''

    // Combine and clean text
    let text = `${title}\n${metaDescription}\n${bodyText}`

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim()

    // Limit length to avoid excessive processing
    const MAX_LENGTH = 10000
    if (text.length > MAX_LENGTH) {
      text = text.substring(0, MAX_LENGTH) + '...'
    }

    return text
  } catch (error) {
    logger.error('Error extracting text from HTML:', error)
    return ''
  }
}