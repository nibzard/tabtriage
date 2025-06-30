import * as cheerio from 'cheerio';
import { convert as htmlToText } from 'html-to-text';
import { logger } from '@/utils/logger';

interface ExtractedContent {
  content: string;
  title: string;
  description: string;
  wordCount: number;
  extractionMethod: string;
}

interface ExtractionStrategy {
  name: string;
  selector?: string;
  removeSelectors?: string[];
  minLength: number;
}

/**
 * Comprehensive HTML content extraction service with multiple fallback strategies
 * Designed to be robust and always return meaningful content for embeddings
 */
export class HtmlContentExtractor {
  private static readonly TIMEOUT_MS = 10000; // 10 second timeout
  private static readonly MAX_CONTENT_LENGTH = 8000; // Optimal for embeddings
  private static readonly MIN_CONTENT_LENGTH = 50; // Minimum acceptable content

  /**
   * Extract content from a URL with multiple fallback strategies
   */
  static async extractFromUrl(url: string): Promise<ExtractedContent | null> {
    try {
      logger.debug(`Starting HTML extraction for: ${url}`);
      
      // Fetch the HTML with timeout protection
      const html = await this.fetchHtmlWithTimeout(url);
      if (!html) {
        logger.warn(`Failed to fetch HTML for: ${url}`);
        return null;
      }

      // Extract content using multiple strategies
      const result = await this.extractContentFromHtml(html, url);
      
      if (result) {
        logger.debug(`Successfully extracted ${result.wordCount} words using ${result.extractionMethod} for: ${url}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error in HTML extraction for ${url}:`, error);
      return null;
    }
  }

  /**
   * Fetch HTML with timeout protection and proper headers
   */
  private static async fetchHtmlWithTimeout(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TabTriage/1.0; +https://tabtriage.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.debug(`HTTP error ${response.status} for: ${url}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        logger.debug(`Non-HTML content type (${contentType}) for: ${url}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.debug(`Timeout fetching HTML for: ${url}`);
      } else {
        logger.debug(`Fetch error for ${url}:`, error);
      }
      return null;
    }
  }

  /**
   * Extract content from HTML using multiple strategies
   */
  private static async extractContentFromHtml(html: string, url: string): Promise<ExtractedContent | null> {
    const $ = cheerio.load(html);
    
    // Define extraction strategies in order of preference
    const strategies: ExtractionStrategy[] = [
      {
        name: 'semantic-content',
        selector: 'main, article, [role="main"], .content, .post-content, .entry-content, .post-body',
        removeSelectors: ['nav', 'header', 'footer', '.nav', '.navigation', '.sidebar', '.ads', '.advertisement', 'script', 'style', '.social-share', '.comments'],
        minLength: 200
      },
      {
        name: 'article-content',
        selector: 'article, .article, .post, .entry, .content-body, .main-content',
        removeSelectors: ['nav', 'header', 'footer', '.nav', '.sidebar', '.ads', 'script', 'style', '.meta', '.author', '.date'],
        minLength: 150
      },
      {
        name: 'body-filtered',
        selector: 'body',
        removeSelectors: ['nav', 'header', 'footer', '.nav', '.navigation', '.sidebar', '.ads', '.advertisement', '.social', '.comments', '.related', 'script', 'style', 'noscript'],
        minLength: 100
      },
      {
        name: 'body-aggressive',
        selector: 'body',
        removeSelectors: ['script', 'style', 'noscript'],
        minLength: 50
      }
    ];

    // Try each strategy
    for (const strategy of strategies) {
      try {
        const result = this.extractWithStrategy($, strategy, url);
        if (result && result.content.length >= strategy.minLength) {
          return result;
        }
      } catch (error) {
        logger.debug(`Strategy ${strategy.name} failed for ${url}:`, error);
      }
    }

    // Final fallback: extract all text
    try {
      const fallbackResult = this.extractAllText($, url);
      if (fallbackResult && fallbackResult.content.length >= this.MIN_CONTENT_LENGTH) {
        return fallbackResult;
      }
    } catch (error) {
      logger.debug(`Fallback extraction failed for ${url}:`, error);
    }

    logger.warn(`All extraction strategies failed for: ${url}`);
    return null;
  }

  /**
   * Extract content using a specific strategy
   */
  private static extractWithStrategy($: cheerio.CheerioAPI, strategy: ExtractionStrategy, url: string): ExtractedContent | null {
    try {
      // Clone the document to avoid modifying the original
      const $clone = cheerio.load($.html());
      
      // Remove unwanted elements
      if (strategy.removeSelectors) {
        strategy.removeSelectors.forEach(selector => {
          $clone(selector).remove();
        });
      }

      // Extract content from the target selector
      let contentElements;
      if (strategy.selector) {
        contentElements = $clone(strategy.selector);
      } else {
        contentElements = $clone('body');
      }

      if (contentElements.length === 0) {
        return null;
      }

      // Convert to clean text
      let rawContent = '';
      contentElements.each((_, element) => {
        const elementText = $clone(element).text();
        if (elementText.trim()) {
          rawContent += elementText + '\n';
        }
      });

      // Clean and process the content
      const cleanContent = this.cleanContent(rawContent);
      
      if (cleanContent.length < strategy.minLength) {
        return null;
      }

      // Extract metadata
      const title = this.extractTitle($);
      const description = this.extractDescription($);
      const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;

      return {
        content: cleanContent,
        title,
        description,
        wordCount,
        extractionMethod: strategy.name
      };
    } catch (error) {
      logger.debug(`Error in strategy ${strategy.name}:`, error);
      return null;
    }
  }

  /**
   * Fallback: extract all text content
   */
  private static extractAllText($: cheerio.CheerioAPI, url: string): ExtractedContent | null {
    try {
      // Remove scripts, styles, and other non-content elements
      $('script, style, noscript, svg').remove();
      
      // Get all text content
      const rawContent = $('body').text() || $.text();
      const cleanContent = this.cleanContent(rawContent);
      
      if (cleanContent.length < this.MIN_CONTENT_LENGTH) {
        return null;
      }

      const title = this.extractTitle($);
      const description = this.extractDescription($);
      const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;

      return {
        content: cleanContent,
        title,
        description,
        wordCount,
        extractionMethod: 'all-text-fallback'
      };
    } catch (error) {
      logger.debug(`All-text extraction failed:`, error);
      return null;
    }
  }

  /**
   * Extract title from HTML
   */
  private static extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple title sources
    const titleSources = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'title',
      'h1'
    ];

    for (const selector of titleSources) {
      const element = $(selector).first();
      if (element.length > 0) {
        const title = selector.includes('meta') 
          ? element.attr('content') 
          : element.text();
        
        if (title && title.trim()) {
          return this.cleanText(title.trim()).substring(0, 200);
        }
      }
    }

    return '';
  }

  /**
   * Extract description from HTML
   */
  private static extractDescription($: cheerio.CheerioAPI): string {
    // Try multiple description sources
    const descSources = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      '.description',
      '.summary',
      'p'
    ];

    for (const selector of descSources) {
      const element = $(selector).first();
      if (element.length > 0) {
        const desc = selector.includes('meta') 
          ? element.attr('content') 
          : element.text();
        
        if (desc && desc.trim() && desc.length > 20) {
          return this.cleanText(desc.trim()).substring(0, 300);
        }
      }
    }

    return '';
  }

  /**
   * Clean and normalize content for embeddings
   */
  private static cleanContent(content: string): string {
    if (!content) return '';

    let cleaned = content
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n\s*\n/g, '\n')
      // Clean up common artifacts
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\s*-\s*/g, ' - ')
      // Remove leading/trailing whitespace
      .trim();

    // Limit length for embeddings
    if (cleaned.length > this.MAX_CONTENT_LENGTH) {
      // Try to truncate at sentence boundary
      const truncated = cleaned.substring(0, this.MAX_CONTENT_LENGTH);
      const lastSentence = truncated.lastIndexOf('. ');
      if (lastSentence > this.MAX_CONTENT_LENGTH * 0.8) {
        cleaned = truncated.substring(0, lastSentence + 1);
      } else {
        cleaned = truncated + '...';
      }
    }

    return cleaned;
  }

  /**
   * Clean individual text strings (titles, descriptions)
   */
  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\n\r\t]/g, ' ')
      .trim();
  }

  /**
   * Convert HTML to clean markdown-like text using html-to-text
   */
  static htmlToCleanText(html: string): string {
    try {
      return htmlToText(html, {
        wordwrap: false,
        selectors: [
          { selector: 'img', format: 'skip' },
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' },
          { selector: 'nav', format: 'skip' },
          { selector: '.ads', format: 'skip' },
          { selector: '.advertisement', format: 'skip' },
          { selector: 'a', options: { ignoreHref: true } }
        ]
      });
    } catch (error) {
      logger.debug('html-to-text conversion failed:', error);
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
}

/**
 * Simple function interface for easy integration
 */
export async function extractPageContentFromHtml(url: string): Promise<{
  content: string;
  title: string;
  description: string;
} | null> {
  const result = await HtmlContentExtractor.extractFromUrl(url);
  
  if (!result) {
    return null;
  }

  return {
    content: result.content,
    title: result.title,
    description: result.description
  };
}