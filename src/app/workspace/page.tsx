'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/Header'
import { HeaderMobile } from '@/components/HeaderMobile'
import { FolderListModern } from '@/components/folders/FolderListModern'
import { TabGalleryModern } from '@/components/gallery/TabGalleryModern'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { useTabs } from '@/hooks/useTabs'
import { useFolders } from '@/hooks/useFolders'
import { useResponsive } from '@/hooks/useUI'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderPlus, Eye } from 'lucide-react'

export default function WorkspacePage() {
  const { tabs } = useTabs()
  const { folders, createFolder, deleteFolder } = useFolders()
  const { isMobile } = useResponsive()
  const searchParams = useSearchParams()
  const queryParam = searchParams?.get('q')

  const [searchTerm, setSearchTerm] = useState(queryParam || '')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const folderTabCounts = useMemo(() => {
    return folders.reduce((acc, folder) => {
      acc[folder.id] = tabs.filter(tab => tab.folderId === folder.id).length
      return acc
    }, {} as Record<string, number>)
  }, [folders, tabs])

  const handleSearch = async (query: string) => {
    setSearchTerm(query)
    if (!query) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    const response = await fetch(`/api/tabs/search?q=${encodeURIComponent(query)}`)
    const results = await response.json()
    setSearchResults(results)
    setIsSearching(false)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim())
    setNewFolderName('')
    setIsCreatingFolder(false)
  }

  return (
    <>
      <main className="min-h-screen bg-background pb-safe-area-inset-bottom">
        {isMobile ? <HeaderMobile /> : <Header />}

        <div className="mobile-container mobile-padding-y">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Workspace</h1>
              <p className="text-muted-foreground">Triage and organize your tabs</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/review">
                  <Eye className="h-4 w-4 mr-2" />
                  Review Mode
                </Link>
              </Button>
              {!isCreatingFolder ? (
                <Button onClick={() => setIsCreatingFolder(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    autoFocus
                  />
                  <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                    Create
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <FolderListModern
                folders={folders}
                selectedFolderId={activeFilter}
                onSelectFolder={setActiveFilter}
                tabCounts={folderTabCounts}
                onDeleteFolder={() => deleteFolder(activeFilter)}
              />
            </div>
            <div className="lg:col-span-3">
              <TabGalleryModern
                activeFilter={activeFilter}
                searchTerm={searchTerm}
                searchResults={searchResults}
                isSearching={isSearching}
                showingDiscarded={activeFilter === 'discarded'}
              />
            </div>
          </div>
        </div>
      </main>
      {isMobile && <MobileNavigation />}
    </>
  )
}
