import { logger } from '@/utils/logger';
import { extractPageContentFromHtml } from './htmlContentExtractor';

/**
 * Extract clean text content from a URL using our HTML extraction system
 * This is a simplified version that only uses our robust HTML extractor
 */
export async function extractPageContent(url: string): Promise<{
  content: string;
  title: string;
  description: string;
} | null> {
  try {
    logger.debug(`Extracting content for: ${url}`);
    
    // Use our HTML extraction directly
    const result = await extractPageContentFromHtml(url);
    
    if (result && result.content.length >= 50) {
      logger.debug(`Successfully extracted ${result.content.length} characters from: ${url}`);
      return {
        content: cleanTextContent(result.content),
        title: result.title || '',
        description: result.description || ''
      };
    } else {
      logger.warn(`Failed to extract sufficient content from: ${url}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error extracting content from ${url}:`, error);
    return null;
  }
}

/**
 * Clean and optimize text content for embedding
 */
function cleanTextContent(content: string): string {
  if (!content) return '';
  
  // Basic cleanup
  let cleaned = content
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
  
  // Limit length to avoid excessive token usage in embeddings
  const MAX_LENGTH = 8000; // ~2000 tokens for typical embedding models
  if (cleaned.length > MAX_LENGTH) {
    // Try to truncate at sentence boundary
    const truncated = cleaned.substring(0, MAX_LENGTH);
    const lastSentence = truncated.lastIndexOf('. ');
    if (lastSentence > MAX_LENGTH * 0.8) {
      cleaned = truncated.substring(0, lastSentence + 1);
    } else {
      cleaned = truncated + '...';
    }
  }
  
  return cleaned;
}


/**
 * Extract content from multiple URLs in batch with rate limiting
 */
export async function extractMultiplePageContents(
  urls: string[],
  delayMs: number = 200
): Promise<Array<{ url: string; result: Awaited<ReturnType<typeof extractPageContent>> }>> {
  const results: Array<{ url: string; result: Awaited<ReturnType<typeof extractPageContent>> }> = [];
  
  for (const url of urls) {
    try {
      const result = await extractPageContent(url);
      results.push({ url, result });
      
      // Rate limiting delay
      if (delayMs > 0 && results.length < urls.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      logger.error(`Failed to extract content from ${url}:`, error);
      results.push({ url, result: null });
    }
  }
  
  return results;
}