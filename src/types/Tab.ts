export interface Tab {
  id: string
  title: string
  url: string
  domain: string
  dateAdded: string
  screenshot?: string
  summary: string
  category: string
  tags: string[]
  status: 'unprocessed' | 'kept' | 'discarded'
  folderId?: string
  suggestedFolders: string[]
}