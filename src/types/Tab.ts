export interface Tab {
  id: string
  title: string
  url: string
  domain: string
  dateAdded: string
  thumbnail?: string
  screenshot?: string
  fullScreenshot?: string
  summary: string
  category: string
  tags: string[]
  status: 'unprocessed' | 'kept' | 'discarded'
  folderId?: string
  suggestedFolders: string[]
  content?: string
  contentExcerpt?: string
}