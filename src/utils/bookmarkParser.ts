import { Tab } from '@/types/Tab'

// Parse Safari bookmark HTML file
export function parseSafariBookmarks(html: string): Partial<Tab>[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Safari bookmarks are typically in a DL > DT structure
  const bookmarkItems = doc.querySelectorAll('dt')
  const tabs: Partial<Tab>[] = []

  bookmarkItems.forEach((item, index) => {
    // Look for A tags which contain the actual bookmark links
    const link = item.querySelector('a')

    if (link) {
      const url = link.getAttribute('href')
      const title = link.textContent || 'Untitled'
      const dateAdded = link.getAttribute('add_date')
        ? new Date(parseInt(link.getAttribute('add_date') || '0') * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      // Extract domain from URL
      let domain = ''
      try {
        if (url) {
          domain = new URL(url).hostname.replace('www.', '')
        }
      } catch (e) {
        console.error('Invalid URL:', url)
      }

      if (url) {
        tabs.push({
          id: `tab-${index}-${Date.now()}`,
          title,
          url,
          domain,
          dateAdded,
          status: 'unprocessed',
          tags: [],
          suggestedFolders: []
        })
      }
    }
  })

  return tabs
}

// Extract tabs from Safari Reading List (special case)
export function parseReadingList(html: string): Partial<Tab>[] {
  // Reading List is typically in a special folder in Safari bookmarks
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Look for the Reading List folder
  const readingListItems: Partial<Tab>[] = []
  const folders = doc.querySelectorAll('dt h3')

  // Convert NodeList to Array to ensure compatibility with all TypeScript configurations
  Array.from(folders).forEach(folder => {
    if (folder.textContent?.includes('Reading List')) {
      // Found Reading List folder, now get its items
      const folderParent = folder.parentElement?.parentElement
      const items = folderParent?.querySelectorAll('dt a')

      if (items) {
        Array.from(items).forEach((link, index) => {
          const url = link.getAttribute('href')
          const title = link.textContent || 'Untitled'
          const dateAdded = link.getAttribute('add_date')
            ? new Date(parseInt(link.getAttribute('add_date') || '0') * 1000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]

          // Extract domain from URL
          let domain = ''
          try {
            if (url) {
              domain = new URL(url).hostname.replace('www.', '')
            }
          } catch (e) {
            console.error('Invalid URL:', url)
          }

          if (url) {
            readingListItems.push({
              id: `reading-${index}-${Date.now()}`,
              title,
              url,
              domain,
              dateAdded,
              status: 'unprocessed',
              tags: [],
              suggestedFolders: ['read-later']
            })
          }
        })
      }

      // Stop after we find the Reading List folder
      return false;
    }
    return true;
  });

  return readingListItems;
}