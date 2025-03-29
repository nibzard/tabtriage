import { Tab } from '@/types/Tab'
import { Folder } from '@/types/Folder'
import { captureScreenshot } from '@/services/screenshotService'
import { fetchPageContent } from './pageContentService'
import { generateSummaryWithAI } from './openaiService'
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
  const domain = extractDomain(url)
  const id = generateUUID()

  return {
    id,
    title: domain || 'Untitled',  // Use domain as title initially, will be updated later
    url,
    domain,
    dateAdded: new Date().toISOString().split('T')[0],
    summary: '',
    category: 'uncategorized',
    tags: [],
    status: 'unprocessed',
    suggestedFolders: []
  }
}

// Parse URLs from text (pasted content)
export function parseTabsFromText(text: string): Tab[] {
  // Split by common delimiters (newlines, spaces, commas)
  const potentialUrls = text.split(/[\n\r\s,]+/).filter(Boolean)

  // Filter valid URLs and create tab objects
  return potentialUrls
    .filter(url => {
      try {
        // Check if it's a valid URL
        new URL(url)
        return true
      } catch (e) {
        // Try adding https:// prefix if missing
        try {
          if (!url.startsWith('http')) {
            new URL(`https://${url}`)
            return true
          }
        } catch (e) {
          // Not a valid URL
        }
        return false
      }
    })
    .map(url => {
      // Add https:// prefix if missing
      if (!url.startsWith('http')) {
        url = `https://${url}`
      }
      return createTabFromUrl(url)
    })
}

// Parse URLs from file (txt or csv)
export async function parseTabsFromFile(file: File): Promise<Tab[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string

        // Parse the content as text
        const tabs = parseTabsFromText(content)
        resolve(tabs)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }

    reader.readAsText(file)
  })
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
        // Step 1: Capture screenshot
        logger.debug(`Capturing screenshot for ${tab.url}`)
        const screenshotUrl = await captureScreenshot(tab.url)

        // Step 2: Fetch page content
        logger.debug(`Fetching content for ${tab.url}`)
        const pageContent = await fetchPageContent(tab.url)

        // Step 3: Generate AI summary
        logger.debug(`Generating AI summary for ${tab.url}`)
        const { summary, category, tags } = await generateSummaryWithAI(tab.url, pageContent || '')

        // Step 4: Generate folder suggestions based on category
        const suggestedFolders = generateFolderSuggestions(category, tags)

        // Log the screenshot URL for debugging
        console.log(`Tab ${tab.id} processing complete:`, {
          url: tab.url,
          screenshotUrl,
          summary: summary.substring(0, 50) + '...',
          category,
          tags
        });
        
        // Return updated tab
        return {
          ...tab,
          screenshot: screenshotUrl || undefined,
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