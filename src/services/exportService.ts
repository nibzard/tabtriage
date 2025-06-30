import { Tab } from '@/types/Tab'
import { Folder } from '@/types/Folder'
import { getTabs, getFolders } from './tabService'
import { logger } from '@/utils/logger'

export type ExportFormat = 'txt' | 'csv' | 'json' | 'html'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  filterByFolder?: string
  filterByStatus?: 'unprocessed' | 'kept' | 'discarded'
  filterByDateRange?: {
    start: string
    end: string
  }
}

export interface ExportResult {
  content: string
  filename: string
  mimeType: string
  count: number
}

/**
 * Export tabs to various formats
 */
export async function exportTabs(options: ExportOptions): Promise<ExportResult> {
  try {
    let tabs = getTabs()
    const folders = getFolders()

    // Apply filters
    if (options.filterByFolder) {
      tabs = tabs.filter(tab => tab.folderId === options.filterByFolder)
    }

    if (options.filterByStatus) {
      tabs = tabs.filter(tab => tab.status === options.filterByStatus)
    }

    if (options.filterByDateRange) {
      tabs = tabs.filter(tab => {
        const tabDate = new Date(tab.dateAdded)
        const startDate = new Date(options.filterByDateRange!.start)
        const endDate = new Date(options.filterByDateRange!.end)
        return tabDate >= startDate && tabDate <= endDate
      })
    }

    if (tabs.length === 0) {
      throw new Error('No tabs match the export criteria')
    }

    const timestamp = new Date().toISOString().split('T')[0]
    let result: ExportResult

    switch (options.format) {
      case 'txt':
        result = exportAsText(tabs, timestamp)
        break
      case 'csv':
        result = exportAsCsv(tabs, timestamp, options.includeMetadata)
        break
      case 'json':
        result = exportAsJson(tabs, folders, timestamp)
        break
      case 'html':
        result = exportAsHtml(tabs, folders, timestamp)
        break
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }

    logger.info(`Exported ${tabs.length} tabs as ${options.format}`)
    return result
  } catch (error) {
    logger.error('Error exporting tabs:', error)
    throw error
  }
}

/**
 * Export as plain text (one URL per line)
 */
function exportAsText(tabs: Tab[], timestamp: string): ExportResult {
  const content = tabs.map(tab => tab.url).join('\n')
  
  return {
    content,
    filename: `tabtriage-urls-${timestamp}.txt`,
    mimeType: 'text/plain',
    count: tabs.length
  }
}

/**
 * Export as CSV for spreadsheet applications
 */
function exportAsCsv(tabs: Tab[], timestamp: string, includeMetadata = true): ExportResult {
  const headers = includeMetadata 
    ? 'Title,URL,Domain,Date Added,Category,Tags,Status,Summary'
    : 'Title,URL,Domain,Date Added'
  
  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
  
  const rows = tabs.map(tab => {
    const basicData = [
      escapeCsv(tab.title || ''),
      escapeCsv(tab.url),
      escapeCsv(tab.domain || ''),
      escapeCsv(tab.dateAdded)
    ]
    
    if (includeMetadata) {
      basicData.push(
        escapeCsv(tab.category || ''),
        escapeCsv(tab.tags?.join('; ') || ''),
        escapeCsv(tab.status || ''),
        escapeCsv(tab.summary || '')
      )
    }
    
    return basicData.join(',')
  })
  
  const content = headers + '\n' + rows.join('\n')
  
  return {
    content,
    filename: `tabtriage-export-${timestamp}.csv`,
    mimeType: 'text/csv',
    count: tabs.length
  }
}

/**
 * Export as JSON with complete data structure
 */
function exportAsJson(tabs: Tab[], folders: Folder[], timestamp: string): ExportResult {
  const exportData = {
    exportDate: new Date().toISOString(),
    exportedBy: 'TabTriage',
    version: '1.0',
    summary: {
      totalTabs: tabs.length,
      totalFolders: folders.length,
      tabsByStatus: {
        unprocessed: tabs.filter(t => t.status === 'unprocessed').length,
        kept: tabs.filter(t => t.status === 'kept').length,
        discarded: tabs.filter(t => t.status === 'discarded').length
      }
    },
    folders: folders,
    tabs: tabs
  }
  
  const content = JSON.stringify(exportData, null, 2)
  
  return {
    content,
    filename: `tabtriage-complete-${timestamp}.json`,
    mimeType: 'application/json',
    count: tabs.length
  }
}

/**
 * Export as HTML bookmarks file (browser-compatible)
 */
function exportAsHtml(tabs: Tab[], folders: Folder[], timestamp: string): ExportResult {
  const folderMap = new Map(folders.map(f => [f.id, f.name]))
  
  // Group tabs by folder
  const tabsByFolder = new Map<string, Tab[]>()
  const unorganizedTabs: Tab[] = []
  
  tabs.forEach(tab => {
    if (tab.folderId && folderMap.has(tab.folderId)) {
      if (!tabsByFolder.has(tab.folderId)) {
        tabsByFolder.set(tab.folderId, [])
      }
      tabsByFolder.get(tab.folderId)!.push(tab)
    } else {
      unorganizedTabs.push(tab)
    }
  })
  
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>TabTriage Bookmarks</TITLE>
<H1>TabTriage Bookmarks</H1>
<DL><p>
`

  // Add organized tabs by folder
  for (const [folderId, folderTabs] of tabsByFolder.entries()) {
    const folderName = folderMap.get(folderId) || 'Unknown Folder'
    html += `    <DT><H3>${escapeHtml(folderName)}</H3>\n    <DL><p>\n`
    
    folderTabs.forEach(tab => {
      const addDate = Math.floor(new Date(tab.dateAdded).getTime() / 1000)
      html += `        <DT><A HREF="${escapeHtml(tab.url)}" ADD_DATE="${addDate}">${escapeHtml(tab.title || tab.domain || 'Untitled')}</A>\n`
      if (tab.summary) {
        html += `        <DD>${escapeHtml(tab.summary)}\n`
      }
    })
    
    html += `    </DL><p>\n`
  }
  
  // Add unorganized tabs
  if (unorganizedTabs.length > 0) {
    html += `    <DT><H3>Unorganized</H3>\n    <DL><p>\n`
    
    unorganizedTabs.forEach(tab => {
      const addDate = Math.floor(new Date(tab.dateAdded).getTime() / 1000)
      html += `        <DT><A HREF="${escapeHtml(tab.url)}" ADD_DATE="${addDate}">${escapeHtml(tab.title || tab.domain || 'Untitled')}</A>\n`
      if (tab.summary) {
        html += `        <DD>${escapeHtml(tab.summary)}\n`
      }
    })
    
    html += `    </DL><p>\n`
  }
  
  html += `</DL><p>`
  
  return {
    content: html,
    filename: `tabtriage-bookmarks-${timestamp}.html`,
    mimeType: 'text/html',
    count: tabs.length
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Download exported data as a file
 */
export function downloadExport(exportResult: ExportResult): void {
  try {
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportResult.filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    logger.info(`Downloaded ${exportResult.filename} with ${exportResult.count} tabs`)
  } catch (error) {
    logger.error('Error downloading export:', error)
    throw error
  }
}

/**
 * Get export statistics
 */
export function getExportStats(): {
  totalTabs: number
  totalFolders: number
  tabsByStatus: Record<string, number>
  tabsByFolder: Record<string, number>
} {
  const tabs = getTabs()
  const folders = getFolders()
  const folderMap = new Map(folders.map(f => [f.id, f.name]))
  
  const tabsByStatus = {
    unprocessed: tabs.filter(t => t.status === 'unprocessed').length,
    kept: tabs.filter(t => t.status === 'kept').length,
    discarded: tabs.filter(t => t.status === 'discarded').length
  }
  
  const tabsByFolder: Record<string, number> = {}
  tabs.forEach(tab => {
    if (tab.folderId && folderMap.has(tab.folderId)) {
      const folderName = folderMap.get(tab.folderId)!
      tabsByFolder[folderName] = (tabsByFolder[folderName] || 0) + 1
    } else {
      tabsByFolder['Unorganized'] = (tabsByFolder['Unorganized'] || 0) + 1
    }
  })
  
  return {
    totalTabs: tabs.length,
    totalFolders: folders.length,
    tabsByStatus,
    tabsByFolder
  }
}