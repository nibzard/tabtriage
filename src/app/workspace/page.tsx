'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Header } from '@/components/Header'
import { HeaderMobile } from '@/components/HeaderMobile'
import { TabGalleryModern } from '@/components/gallery/TabGalleryModern'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { useTabs } from '@/hooks/useTabs'
import { useFolders } from '@/hooks/useFolders'
import { useResponsive } from '@/hooks/useUI'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchBar from '@/components/gallery/SearchBar'
import { FolderPlus, Eye, Loader2, Copy } from 'lucide-react'

export default function WorkspacePage() {
  const { tabs, isLoading } = useTabs()
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
  const [searchWeight, setSearchWeight] = useState(1)
  const searchWeightTimeoutRef = useRef<NodeJS.Timeout>()

  const onFilterChange = (filter: string) => {
    setActiveFilter(filter)
  }

  const folderTabCounts = useMemo(() => {
    return folders.reduce((acc, folder) => {
      acc[folder.id] = tabs.filter(tab => tab.folderId === folder.id).length
      return acc
    }, {} as Record<string, number>)
  }, [folders, tabs])

  const handleSearch = async (query: string, weight?: number) => {
    const currentWeight = weight !== undefined ? weight : searchWeight
    setSearchTerm(query)
    if (!query) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        q: query,
        weight: currentWeight.toString()
      })
      const response = await fetch(`/api/tabs/search?${params}`)
      const results = await response.json()
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchWeightChange = (newWeight: number) => {
    setSearchWeight(newWeight)
    
    // Debounce search to avoid too many API calls
    if (searchWeightTimeoutRef.current) {
      clearTimeout(searchWeightTimeoutRef.current)
    }
    
    // If there's an active search, re-run it with the new weight after delay
    if (searchTerm) {
      searchWeightTimeoutRef.current = setTimeout(() => {
        handleSearch(searchTerm, newWeight)
      }, 300)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim())
    setNewFolderName('')
    setIsCreatingFolder(false)
  }

  return (
    <>
      <main className="min-h-screen bg-background pb-safe-area-inset-bottom overflow-x-hidden">
        {isMobile ? <HeaderMobile /> : <Header />}

        <div className="mobile-container mobile-padding-y">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex-1">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search tabs with AI or keywords..."
                initialQuery={searchTerm}
                isSearching={isSearching}
                searchResultsCount={searchResults.length}
                searchMode={searchTerm ? (searchWeight <= 0.5 ? 'keyword' : searchWeight >= 1.5 ? 'semantic' : 'hybrid') : 'none'}
                searchWeight={searchWeight}
                onSearchWeightChange={handleSearchWeightChange}
              />
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/review">
                  <Eye className="h-4 w-4 mr-2" />
                  Review Mode
                </Link>
              </Button>
              {!isMobile && (
                <>
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
                </>
              )}
            </div>
          </div>

          <div className="w-full">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">Loading tabs...</p>
                </div>
              </div>
            ) : (
              <TabGalleryModern
                activeFilter={activeFilter}
                searchTerm={searchTerm}
                searchResults={searchResults}
                isSearching={isSearching}
                showingDiscarded={activeFilter === 'discarded'}
                folders={folders}
                folderTabCounts={folderTabCounts}
                onFilterChange={setActiveFilter}
              />
            )}
          </div>
        </div>
      </main>
      {isMobile && <MobileNavigation />}
    </>
  )
}
