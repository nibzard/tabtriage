'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/Header'
import { HeaderMobile } from '@/components/HeaderMobile'
import { DraggableTabCard } from '@/components/gallery/DraggableTabCard'
import { SearchFilterPanel, SearchFilters } from '@/components/gallery/SearchFilterPanel'
import SearchBar from '@/components/gallery/SearchBar'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { useTabs } from '@/hooks/useTabs'
import { useFolders } from '@/hooks/useFolders'
import { useResponsive } from '@/hooks/useUI'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Tab } from '@/types/Tab'
import { Folder } from '@/types/Folder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FolderPlus, 
  Archive,
  Heart,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Folder as FolderIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

export default function WorkspacePage() {
  const { tabs, keepTab, discardTab, deleteTab, assignToFolder } = useTabs()
  const { folders, createFolder, deleteFolder } = useFolders()
  const { isMobile } = useResponsive()
  const searchParams = useSearchParams()
  const queryParam = searchParams?.get('q')
  
  // Unified state
  const [searchTerm, setSearchTerm] = useState(queryParam || '')
  const [searchResults, setSearchResults] = useState<Tab[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [semanticWeight, setSemanticWeight] = useState(1.0)
  const [fullTextWeight, setFullTextWeight] = useState(1.0)
  const [showFilters, setShowFilters] = useState(false)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    status: ['unprocessed'],
    category: [],
    folder: [],
    dateRange: 'all'
  })
  const [searchMode, setSearchMode] = useState<'keyword' | 'hybrid' | 'none'>('none')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null)

  // Calculate folder tab counts
  const folderTabCounts = useMemo(() => {
    return folders.reduce((acc, folder) => {
      acc[folder.id] = tabs.filter(tab => tab.folderId === folder.id && tab.status === 'kept').length
      return acc
    }, {} as Record<string, number>)
  }, [folders, tabs])


  // Apply search filters to results
  const applySearchFilters = (tabsToFilter: Tab[]): Tab[] => {
    let filtered = tabsToFilter

    if (searchFilters.status.length > 0) {
      filtered = filtered.filter(tab => 
        searchFilters.status.includes(tab.status || 'unprocessed')
      )
    }

    if (searchFilters.category.length > 0) {
      filtered = filtered.filter(tab => 
        searchFilters.category.includes(tab.category || 'uncategorized')
      )
    }

    if (searchFilters.folder.length > 0) {
      filtered = filtered.filter(tab => {
        const tabFolderId = tab.folderId || 'unorganized'
        return searchFilters.folder.includes(tabFolderId)
      })
    }

    if (searchFilters.dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(tab => {
        const tabDate = new Date(tab.dateAdded || tab.date_added || 0)
        
        switch (searchFilters.dateRange) {
          case 'today':
            return tabDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return tabDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            return tabDate >= monthAgo
          default:
            return true
        }
      })
    }

    return filtered
  }

  // Get tabs for selected folder (for sidebar preview)
  const selectedFolderTabs = useMemo(() => {
    if (!selectedFolderId) return []
    return tabs.filter(tab => tab.folderId === selectedFolderId && tab.status === 'kept')
  }, [selectedFolderId, tabs])

  // Filter tabs for main display
  const displayTabs = useMemo(() => {
    // Use search results if available
    if (searchTerm && searchResults.length > 0) {
      return applySearchFilters(searchResults)
    }

    // Filter tabs based on current filters
    let filtered = tabs.filter(tab => {
      // Apply status filter
      if (searchFilters.status.length > 0) {
        return searchFilters.status.includes(tab.status || 'unprocessed')
      }
      return tab.status === 'unprocessed' // Default to unprocessed
    })

    // Apply other filters
    return applySearchFilters(filtered)
  }, [tabs, searchTerm, searchResults, searchFilters])

  // Handle search using vector embeddings
  const handleSearch = async (query: string) => {
    setSearchTerm(query)
    
    if (!query) {
      setSearchResults([])
      setIsSearching(false)
      setSearchMode('none')
      return
    }
    
    try {
      setIsSearching(true)
      
      const response = await fetch(
        `/api/tabs/search?q=${encodeURIComponent(query)}&fullTextWeight=${fullTextWeight}&semanticWeight=${semanticWeight}`
      )
      
      const results = await response.json()
      
      if (!response.ok) {
        throw new Error('Search request failed')
      }
      
      if (results.error) {
        throw new Error(results.error)
      }
      
      let rawResults: Tab[] = []
      
      if (Array.isArray(results)) {
        rawResults = results
        const searchModeHeader = response.headers.get('X-Search-Mode')
        setSearchMode(searchModeHeader === 'hybrid' ? 'hybrid' : 'keyword')
      } else if (results.results) {
        rawResults = results.results
        setSearchMode(results.searchMode || 'hybrid')
      } else {
        console.error('Unexpected search response format:', results)
        rawResults = []
        setSearchMode('keyword')
      }

      const filteredResults = applySearchFilters(rawResults)
      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Search error:', error)
      if (error instanceof Error && error.message !== 'Search request failed') {
        toast.error('Advanced search unavailable. Using basic search instead.')
      }
      setSearchMode('keyword')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search weights change
  const handleSearchWeightChange = (value: number) => {
    const fullWeight = 2 - value
    const semWeight = value
    
    setFullTextWeight(fullWeight)
    setSemanticWeight(semWeight)
    
    if (searchTerm) {
      handleSearch(searchTerm)
    }
  }

  // Create a new folder
  const handleCreateFolder = async (folderName?: string) => {
    const name = folderName || newFolderName.trim()
    if (!name) {
      toast.error('Please enter a folder name')
      return
    }

    try {
      const newFolder = await createFolder(name)
      setSelectedFolderId(newFolder.id)
      setNewFolderName('')
      setIsCreatingFolder(false)
      toast.success(`Folder "${name}" created successfully`)
    } catch (error) {
      console.error('Error creating folder:', error)
      toast.error('Failed to create folder. Please try again.')
    }
  }

  // Handle drag and drop functions
  const handleDragStart = (tab: Tab) => {
    setDraggedTab(tab)
  }

  const handleDragEnd = () => {
    setDraggedTab(null)
  }

  const handleDropOnFolder = async (folderId: string) => {
    if (!draggedTab) return
    
    try {
      await assignToFolder(draggedTab.id, folderId)
      const folder = folders.find(f => f.id === folderId)
      toast.success(`Tab moved to "${folder?.name}"`)
    } catch (error) {
      console.error('Error assigning tab to folder:', error)
      toast.error('Failed to move tab to folder')
    } finally {
      setDraggedTab(null)
    }
  }

  // Quick action handlers
  const handleQuickKeep = async (tabId: string) => {
    try {
      await keepTab(tabId)
      toast.success('Tab kept')
    } catch (error) {
      console.error('Error keeping tab:', error)
      toast.error('Failed to keep tab')
    }
  }

  const handleQuickDiscard = async (tabId: string) => {
    try {
      await discardTab(tabId)
      toast.success('Tab discarded')
    } catch (error) {
      console.error('Error discarding tab:', error)
      toast.error('Failed to discard tab')
    }
  }

  const handleQuickDelete = (tabId: string) => {
    handleDeleteTab(tabId)
  }

  const handleCreateFolderAndAssign = async (tabId: string, folderName: string) => {
    try {
      const newFolder = await createFolder(folderName)
      await assignToFolder(tabId, newFolder.id)
      toast.success(`Tab moved to new folder "${folderName}"`)
    } catch (error) {
      console.error('Error creating folder and assigning tab:', error)
      toast.error('Failed to create folder')
    }
  }

  // Handle folder deletion
  const handleDeleteFolder = () => {
    if (!selectedFolderId) return
    
    const folder = folders.find(f => f.id === selectedFolderId)
    const tabCount = folderTabCounts[selectedFolderId] || 0
    
    if (window.confirm(
      `Delete "${folder?.name}"? ${tabCount > 0 ? `${tabCount} tabs will be moved to Unorganized.` : ''}`
    )) {
      deleteFolder(selectedFolderId)
      setSelectedFolderId(folders[0]?.id || '')
      toast.success('Folder deleted')
    }
  }

  // Handle tab deletion
  const handleDeleteTab = (tabId: string) => {
    if (window.confirm('Permanently delete this tab? This cannot be undone.')) {
      deleteTab(tabId)
      toast.success('Tab deleted')
    }
  }

  // Effects
  useEffect(() => {
    if (queryParam) {
      handleSearch(queryParam)
    }
  }, [queryParam])

  useEffect(() => {
    if (searchTerm && searchResults.length > 0) {
      handleSearch(searchTerm)
    }
  }, [searchFilters])

  // Check if there are any tabs
  const hasTabs = tabs.length > 0

  if (!hasTabs) {
    return (
      <>
        <main className="min-h-screen bg-background pb-safe-area-inset-bottom">
          {isMobile ? <HeaderMobile /> : <Header />}

          <div className="mobile-container mobile-padding-y">
            <div className="max-w-md mx-auto text-center space-y-6">
              <div className="p-12 bg-muted/30 rounded-full w-fit mx-auto">
                <Upload className="h-16 w-16 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">
                  Welcome to your workspace
                </h2>
                <p className="text-muted-foreground">
                  Import your Safari tabs to start triaging and organizing them.
                </p>
              </div>
              <Button asChild size="lg" className="touch-target-large">
                <Link href="/import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Tabs
                </Link>
              </Button>
            </div>
          </div>
        </main>
        
        {isMobile && <MobileNavigation />}
      </>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-background pb-safe-area-inset-bottom">
        {isMobile ? <HeaderMobile /> : <Header />}

        <div className="mobile-container mobile-padding-y">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Workspace</h1>
              <p className="text-muted-foreground">Triage and organize your tabs in one place</p>
            </div>
            
            {/* New Folder Button */}
            {!isCreatingFolder ? (
              <Button
                onClick={() => setIsCreatingFolder(true)}
                className="touch-target"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') {
                      setIsCreatingFolder(false)
                      setNewFolderName('')
                    }
                  }}
                  className="touch-target"
                  autoFocus
                />
                <Button
                  onClick={() => handleCreateFolder()}
                  disabled={!newFolderName.trim()}
                  className="touch-target"
                >
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingFolder(false)
                    setNewFolderName('')
                  }}
                  className="touch-target"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <SearchBar 
              onSearch={handleSearch}
              placeholder="Search tabs by content or meaning..."
              initialQuery={searchTerm}
              onSearchWeightChange={handleSearchWeightChange}
              isSearching={isSearching}
              searchResultsCount={searchResults.length}
              searchMode={searchMode}
            />
            
            {/* Search Results Summary and Filter Toggle */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                {searchTerm && (
                  <p className="text-sm text-muted-foreground flex items-center">
                    {searchResults.length > 0 ? (
                      <>Found {searchResults.length} results for "{searchTerm}"</>
                    ) : searchMode !== 'none' ? (
                      <>No results found for "{searchTerm}"</>
                    ) : null}
                    
                    {searchMode === 'keyword' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Keyword search
                      </span>
                    )}
                    
                    {searchMode === 'hybrid' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                        Enhanced search
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              {/* Filter Toggle */}
              {(searchTerm || Object.values(searchFilters).some(f => Array.isArray(f) ? f.length > 0 : f !== 'all')) && (
                <SearchFilterPanel
                  tabs={searchTerm ? searchResults : tabs}
                  activeFilters={searchFilters}
                  onFiltersChange={setSearchFilters}
                  searchTerm={searchTerm}
                  isVisible={showFilters}
                  onToggle={() => setShowFilters(!showFilters)}
                />
              )}
            </div>

            {/* Active Filter Panel */}
            {showFilters && (
              <div className="mt-3">
                <SearchFilterPanel
                  tabs={searchTerm ? searchResults : tabs}
                  activeFilters={searchFilters}
                  onFiltersChange={setSearchFilters}
                  searchTerm={searchTerm}
                  isVisible={true}
                  onToggle={() => setShowFilters(false)}
                />
              </div>
            )}
          </div>

          {/* Main Layout */}
          <div className={`grid gap-6 ${
            isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'
          }`}>
            {/* Folders Sidebar */}
            <div className={isMobile ? '' : 'lg:col-span-1'}>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderIcon className="h-5 w-5" />
                    Folders
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Folder List */}
                  <div className="space-y-2">
                    {folders.map((folder, index) => (
                      <motion.div
                        key={folder.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (draggedTab) {
                            e.currentTarget.classList.add('bg-primary/10')
                          }
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-primary/10')
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove('bg-primary/10')
                          if (draggedTab) {
                            handleDropOnFolder(folder.id)
                          }
                        }}
                      >
                        <div
                          className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedFolderId === folder.id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted/50'
                          } ${draggedTab ? 'border-2 border-dashed border-muted-foreground/30' : ''}`}
                          onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: folder.color || '#4B5563' }}
                            />
                            <span className={`font-medium truncate ${
                              selectedFolderId === folder.id 
                                ? 'text-primary' 
                                : 'text-foreground'
                            }`}>
                              {folder.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={selectedFolderId === folder.id ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {folderTabCounts[folder.id] || 0}
                            </Badge>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteFolder(folder.id)
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Folder
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {draggedTab && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 text-center"
                      >
                        <Plus className="h-4 w-4 mx-auto mb-1 text-primary" />
                        <span className="text-sm text-primary font-medium">Drop to create new folder</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Empty State */}
                  {folders.length === 0 && !draggedTab && (
                    <div className="text-center py-6 space-y-2">
                      <FolderIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No folders yet. Create one to organize your tabs.
                      </p>
                    </div>
                  )}

                  {/* Selected Folder Preview */}
                  {selectedFolderId && selectedFolderTabs.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Folder Preview</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedFolderTabs.slice(0, 5).map(tab => (
                          <div key={tab.id} className="text-xs p-2 bg-muted rounded text-muted-foreground truncate">
                            {tab.title}
                          </div>
                        ))}
                        {selectedFolderTabs.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{selectedFolderTabs.length - 5} more tabs
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className={isMobile ? '' : 'lg:col-span-3'}>
              {/* Loading state */}
              {isSearching ? (
                <Card className="p-8">
                  <CardContent className="text-center space-y-4">
                    <div className="h-8 w-8 animate-spin mx-auto border-b-2 border-primary rounded-full"></div>
                    <p className="text-muted-foreground">Searching tabs...</p>
                  </CardContent>
                </Card>
              ) : displayTabs.length === 0 ? (
                <Card className="p-8">
                  <CardContent className="text-center space-y-4">
                    {searchTerm ? (
                      <>
                        <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">No results found</h3>
                          <p className="text-muted-foreground">
                            No tabs match "{searchTerm}". Try adjusting your search terms.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Filter className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">No tabs to display</h3>
                          <p className="text-muted-foreground">
                            Try changing your filter settings or import more tabs.
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Tab Count */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {displayTabs.length} tab{displayTabs.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Tab Grid */}
                  <div className="grid gap-4 mobile-grid">
                    <AnimatePresence>
                      {displayTabs.map((tab, index) => (
                        <motion.div
                          key={tab.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <DraggableTabCard
                            tab={tab}
                            searchTerm={searchTerm}
                            onDragStart={() => handleDragStart(tab)}
                            onDragEnd={handleDragEnd}
                            onKeep={() => handleQuickKeep(tab.id)}
                            onDiscard={() => handleQuickDiscard(tab.id)}
                            onDelete={() => handleQuickDelete(tab.id)}
                            onCreateFolderAndAssign={(folderName) => handleCreateFolderAndAssign(tab.id, folderName)}
                            folders={folders}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {isMobile && <MobileNavigation />}
    </>
  )
}