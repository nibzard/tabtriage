import { Tab } from '@/types/Tab'
import { Folder } from '@/types/Folder'
import { captureScreenshots } from '@/services/screenshotService'
import { fetchPageContent } from './pageContentService'
import { generateSummaryWithAI } from './openaiService'
import { generateTabEmbedding } from './embeddingService'
import { logger } from '@/utils/logger'
import { generateUUID } from '@/utils/uuid'

// In a real application, these functions would make API calls to a backend
// For the MVP, we're implementing them with localStorage for client-side persistence

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch (e) {
    return ''
  }
}

// Create a tab object from a URL
function createTabFromUrl(url: string): Tab {
  try {
    const domain = extractDomain(url)
    const id = generateUUID()
    
    // Make sure URL is valid and properly formatted
    try {
      new URL(url); // Validate URL
    } catch (e) {
      // If invalid, force add https:// if not present
      if (!url.startsWith('http')) {
        url = `https://${url}`;
        // Validate again
        new URL(url);
      } else {
        // Still invalid even with http, use a placeholder
        console.warn(`Invalid URL format: ${url}, using placeholder`);
        url = `https://example.com/invalid-url-${id}`;
      }
    }

    return {
      id,
      title: domain || 'Untitled',  // Use domain as title initially, will be updated later
      url,
      domain: domain || extractDomain(url) || 'unknown',
      dateAdded: new Date().toISOString().split('T')[0],
      summary: '',
      category: 'uncategorized',
      tags: [],
      status: 'unprocessed',
      suggestedFolders: []
    }
  } catch (error) {
    console.error(`Error creating tab from URL: ${url}`, error);
    // Return a fallback tab to prevent complete failure
    return {
      id: generateUUID(),
      title: 'Error URL',
      url: 'https://example.com/error',
      domain: 'example.com',
      dateAdded: new Date().toISOString().split('T')[0],
      summary: `Error processing original URL: ${url}`,
      category: 'uncategorized',
      tags: ['error'],
      status: 'unprocessed',
      suggestedFolders: []
    };
  }
}

/**
 * Basic check to see if a string looks like a URL
 * This is intentionally not too strict, just to filter out obvious non-URLs
 */
function looksLikeUrl(str: string): boolean {
  // Empty strings are not URLs
  if (!str || str.trim() === '') return false;
  
  // Too short strings are not URLs (at least a.b)
  if (str.length < 3) return false;
  
  // Single words without dots are not URLs (like "Book")
  if (!str.includes('.') && !/\s/.test(str)) return false;
  
  // Check if it has a protocol prefix
  const hasProtocolPrefix = 
    str.startsWith('http://') || 
    str.startsWith('https://') || 
    str.startsWith('ftp://') || 
    str.startsWith('file://');
  
  // If it has a protocol, we can validate it directly
  if (hasProtocolPrefix) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }
  
  // Check for domain-like patterns (something.something)
  if (str.includes('.')) {
    // Common TLDs check - domain must END with these, not just include them
    const commonTlds = ['.com', '.org', '.net', '.io', '.dev', '.co', '.app', '.edu', '.gov', '.me', '.info', 
                        '.ai', '.wiki', '.github.io'];
    const endsWithTld = commonTlds.some(tld => str.endsWith(tld) || str.includes(tld + '/'));
    
    // Check if it starts with www.
    const startsWithWww = str.startsWith('www.');
    
    // Check if it follows domain pattern (letters, numbers, dashes followed by dot)
    const hasDomainPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(str);
    
    // If it has typical URL structure (any of the above), it's likely a URL
    if (endsWithTld || startsWithWww || hasDomainPattern) {
      // Try to validate it with https:// prefix
      try {
        new URL(`https://${str}`);
        return true;
      } catch {
        // Even if URL constructor fails, it might still be a valid domain
        // This could happen with unusual TLDs or internal domains
        return hasDomainPattern || startsWithWww;
      }
    }
  }
  
  // Special cases - IP-like addresses
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(str)) {
    try {
      new URL(`http://${str}`);
      return true;
    } catch {
      return false;
    }
  }
  
  // If we've reached here, it's not a URL
  return false;
}

// Parse URLs from text (pasted content)
export function parseTabsFromText(text: string): Tab[] {
  try {
    // Handle empty input
    if (!text || text.trim() === '') {
      return [];
    }
    
    // Split by common delimiters (newlines, spaces, commas)
    const potentialUrls = text.split(/[\n\r\s,]+/).filter(Boolean);
    
    console.log('Potential URLs:', potentialUrls);
    
    // Filter valid URLs and create tab objects
    const validUrls = [];
    const invalidUrls = [];
    
    for (const url of potentialUrls) {
      try {
        const isValid = looksLikeUrl(url);
        if (isValid) {
          validUrls.push(url);
        } else {
          invalidUrls.push(url);
        }
      } catch (validationError) {
        console.error(`Error validating URL: ${url}`, validationError);
        invalidUrls.push(url);
      }
    }
    
    console.log('Valid URLs after filtering:', validUrls);
    console.log('Invalid URLs skipped:', invalidUrls);
    
    // Create tab objects with error handling
    const tabs = [];
    for (const url of validUrls) {
      try {
        // Add https:// prefix if missing
        let processedUrl = url;
        if (!processedUrl.startsWith('http')) {
          processedUrl = `https://${processedUrl}`;
        }
        
        const tab = createTabFromUrl(processedUrl);
        tabs.push(tab);
      } catch (tabCreationError) {
        console.error(`Error creating tab from URL: ${url}`, tabCreationError);
        // Skip this URL instead of failing the entire batch
      }
    }
    
    return tabs;
  } catch (error) {
    console.error('Error parsing URLs from text:', error);
    return []; // Return empty array on error instead of throwing
  }
}

// Parse URLs from file (txt or csv)
export async function parseTabsFromFile(file: File): Promise<Tab[]> {
  return new Promise((resolve, reject) => {
    // Validate file exists
    if (!file) {
      console.error('No file provided');
      resolve([]);
      return;
    }
    
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (!content) {
          console.error('File content is empty');
          resolve([]);
          return;
        }

        // Parse the content as text
        const tabs = parseTabsFromText(content);
        console.log(`File parsing complete. Found ${tabs.length} valid URLs.`);
        resolve(tabs);
      } catch (error) {
        console.error('Error parsing file content:', error);
        // Don't reject, return an empty array to avoid breaking the UI
        resolve([]);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      // Don't reject, return an empty array to avoid breaking the UI
      resolve([]);
    };

    try {
      reader.readAsText(file);
    } catch (error) {
      console.error('Error initiating file read:', error);
      resolve([]);
    }
  });
}

// Process tabs with AI and capture screenshots
export async function processTabsWithAI(tabs: Tab[]): Promise<Tab[]> {
  // Process in batches to avoid overwhelming the system
  const batchSize = 5
  const processedTabs: Tab[] = []

  for (let i = 0; i < tabs.length; i += batchSize) {
    const batch = tabs.slice(i, i + batchSize)
    logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(tabs.length/batchSize)} (${batch.length} tabs)`)

    // Process batch in parallel
    const batchPromises = batch.map(async (tab) => {
      try {
        // Step 1: Capture screenshots (thumbnail and full-height)
        logger.debug(`Capturing screenshots for ${tab.url}`)
        const { thumbnail: screenshotUrl, fullHeight: fullScreenshotUrl } = await captureScreenshots(tab.url)

        // Step 2: Fetch page content
        logger.debug(`Fetching content for ${tab.url}`)
        const pageContent = await fetchPageContent(tab.url)

        // Step 3: Generate AI summary
        logger.debug(`Generating AI summary for ${tab.url}`)
        const { summary, category, tags } = await generateSummaryWithAI(tab.url, pageContent || '')

        // Step 4: Generate folder suggestions based on category
        const suggestedFolders = generateFolderSuggestions(category, tags)

        // Log the screenshot URLs for debugging
        console.log(`Tab ${tab.id} processing complete:`, {
          url: tab.url,
          screenshotUrl,
          fullScreenshotUrl,
          summary: summary.substring(0, 50) + '...',
          category,
          tags
        });
        
        // Return updated tab
        return {
          ...tab,
          screenshot: screenshotUrl || undefined,
          fullScreenshot: fullScreenshotUrl || undefined,
          summary,
          category,
          tags,
          suggestedFolders
        }
      } catch (error) {
        logger.error(`Error processing tab ${tab.id}:`, error)
        return tab
      }
    })

    // Wait for all tabs in batch to be processed
    const processedBatch = await Promise.all(batchPromises)
    processedTabs.push(...processedBatch)
  }

  return processedTabs
}

// Generate folder suggestions based on category and tags
function generateFolderSuggestions(category: string, tags: string[]): string[] {
  const suggestions: string[] = []

  // Map categories to folder suggestions
  switch (category) {
    case 'news':
      suggestions.push('read-later')
      break
    case 'shopping':
      suggestions.push('shopping')
      break
    case 'reference':
      suggestions.push('reference')
      break
    case 'social':
      suggestions.push('social')
      break
    case 'entertainment':
      suggestions.push('entertainment')
      break
    case 'technology':
      suggestions.push('tech')
      break
    case 'travel':
      suggestions.push('travel')
      break
    default:
      suggestions.push('read-later')
  }

  // Add additional suggestions based on tags
  for (const tag of tags) {
    if (tag === 'recipe' || tag === 'food') {
      suggestions.push('recipes')
    } else if (tag === 'work' || tag === 'productivity') {
      suggestions.push('work')
    } else if (tag === 'travel' || tag === 'vacation') {
      suggestions.push('travel')
    } else if (tag === 'tech' || tag === 'technology') {
      suggestions.push('tech')
    }
  }

  // Remove duplicates and return
  const uniqueSuggestions = Array.from(new Set(suggestions))
  return uniqueSuggestions
}

// Save tabs to storage
export function saveTabs(tabs: Tab[]): void {
  localStorage.setItem('tabtriage_tabs', JSON.stringify(tabs))
}

// Get tabs from storage
export function getTabs(): Tab[] {
  const tabsJson = localStorage.getItem('tabtriage_tabs')
  return tabsJson ? JSON.parse(tabsJson) : []
}

// Update tab status
export function updateTabStatus(tabId: string, status: 'unprocessed' | 'kept' | 'discarded'): void {
  const tabs = getTabs()
  const updatedTabs = tabs.map(tab =>
    tab.id === tabId ? { ...tab, status } : tab
  )
  saveTabs(updatedTabs)
}

// Assign tab to folder
export function assignTabToFolder(tabId: string, folderId: string): void {
  const tabs = getTabs()
  
  // Use type assertion to ensure the status is one of the valid enum values
  const updatedTabs = tabs.map(tab => {
    if (tab.id === tabId) {
      return {
        ...tab,
        folderId,
        status: 'kept' as const // Use const assertion to ensure it's the literal type
      }
    }
    return tab
  })
  
  saveTabs(updatedTabs)
}

// Save folders to storage
export function saveFolders(folders: Folder[]): void {
  localStorage.setItem('tabtriage_folders', JSON.stringify(folders))
}

// Get folders from storage
export function getFolders(): Folder[] {
  const foldersJson = localStorage.getItem('tabtriage_folders')
  return foldersJson ? JSON.parse(foldersJson) : []
}

// Create new folder
export function createFolder(name: string): Folder {
  const folders = getFolders()
  const newFolder: Folder = {
    id: `folder-${Date.now()}`,
    name
  }

  saveFolders([...folders, newFolder])
  return newFolder
}