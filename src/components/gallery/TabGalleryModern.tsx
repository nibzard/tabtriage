'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tab } from '@/types/Tab'
import { TabCard } from './TabCard'
import { useTabs } from '@/hooks/useTabs'
import { useBulkActions, useResponsive } from '@/hooks/useUI'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckSquare, 
  Trash2, 
  Heart, 
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Type,
  Globe,
  FolderOpen,
  Archive,
  Grid2X2,
  LayoutGrid,
  Maximize2,
  Minimize2,
  CopyCheck,
  Copy,
  List
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TabGalleryModernProps {
  activeFilter: string
  searchTerm: string
  searchResults: Tab[]
  isSearching: boolean
  showingDiscarded: boolean
  folders?: Array<{ id: string; name: string; color?: string }>
  folderTabCounts?: Record<string, number>
  onFilterChange?: (filter: string) => void
}

export function TabGalleryModern({
  activeFilter,
  searchTerm,
  searchResults,
  isSearching,
  showingDiscarded,
  folders = [],
  folderTabCounts = {},
  onFilterChange
}: TabGalleryModernProps) {
  const { 
    tabs, 
    keepTab, 
    discardTab, 
    deleteTab, 
    assignToFolder, 
    createFolder,
    findDuplicateTabs
  } = useTabs()
  const { 
    selectedTabs, 
    isTabSelected, 
    toggleTabSelection, 
    selectAllTabs, 
    clearSelectedTabs 
  } = useBulkActions()
  const { isMobile } = useResponsive()
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null)
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'domain-asc' | 'domain-desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tabtriage-sort-preference')
      if (saved && ['date-desc', 'date-asc', 'title-asc', 'title-desc', 'domain-asc', 'domain-desc'].includes(saved)) {
        return saved as any
      }
    }
    return 'date-desc'
  })
  
  const [thumbnailSize, setThumbnailSize] = useState<'small' | 'medium' | 'large' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tabtriage-thumbnail-size')
      if (saved && ['small', 'medium', 'large', 'list'].includes(saved)) {
        return saved as any
      }
    }
    return 'medium'
  })
  
  // Save preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tabtriage-sort-preference', sortBy)
    }
  }, [sortBy])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tabtriage-thumbnail-size', thumbnailSize)
    }
  }, [thumbnailSize])
  
  const filteredTabs = useMemo(() => {
    let result: Tab[] = []
    
    if (searchTerm && searchResults.length > 0) {
      result = searchResults
    } else if (activeFilter === 'duplicates') {
      result = findDuplicateTabs()
    } else {
      result = tabs.filter(tab => {
        if (activeFilter === 'all') return tab.status === 'unprocessed'
        if (activeFilter === 'kept') return tab.status === 'kept'
        if (activeFilter === 'discarded') return tab.status === 'discarded'
        
        // Check if it's a folder ID
        const isFolder = folders.some(folder => folder.id === activeFilter)
        if (isFolder) {
          return tab.folderId === activeFilter
        }
        
        // Legacy category filtering
        const categoryMatch = tab.category === activeFilter && tab.status === 'unprocessed'
        return categoryMatch
      })
    }
    
    // Apply sorting
    const sortedResult = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        case 'date-asc':
          return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '')
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '')
        case 'domain-asc':
          return (a.domain || '').localeCompare(b.domain || '')
        case 'domain-desc':
          return (b.domain || '').localeCompare(a.domain || '')
        default:
          return 0
      }
    })
    
    return sortedResult
  }, [tabs, activeFilter, searchTerm, searchResults, sortBy])

  // Simple CSS Grid approach - no complex calculations needed
  const getGridClass = () => {
    if (thumbnailSize === 'list') {
      return 'tab-gallery-list'
    }
    return `tab-gallery-${thumbnailSize}`
  }


  const handleBulkKeep = () => {
    selectedTabs.forEach(tabId => keepTab(tabId))
    clearSelectedTabs()
  }

  const handleBulkDiscard = () => {
    selectedTabs.forEach(tabId => discardTab(tabId))
    clearSelectedTabs()
  }

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedTabs.size} selected tabs permanently?`)) {
      selectedTabs.forEach(tabId => deleteTab(tabId))
      clearSelectedTabs()
    }
  }

  const handleSelectAll = () => {
    selectAllTabs(filteredTabs.map(tab => tab.id))
  }

  const handleSelectDuplicates = () => {
    const duplicateTabs = findDuplicateTabs()
    const tabsToSelect: string[] = []
    const urlMap = new Map<string, Tab[]>()

    duplicateTabs.forEach(tab => {
      const url = tab.url
      if (!urlMap.has(url)) {
        urlMap.set(url, [])
      }
      urlMap.get(url)!.push(tab)
    })

    urlMap.forEach(tabs => {
      if (tabs.length > 1) {
        tabs.slice(1).forEach(tab => {
          tabsToSelect.push(tab.id)
        })
      }
    })

    selectAllTabs(tabsToSelect)
  }

  const handleCreateFolderAndAssign = async (tabId: string, folderName: string) => {
    const newFolder = await createFolder(folderName)
    await assignToFolder(tabId, newFolder.id)
  }

  if (isSearching) {
    return (
      <Card className="p-8">
        <CardContent className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Searching tabs...</p>
        </CardContent>
      </Card>
    )
  }

  if (filteredTabs.length === 0) {
    const isEmptySearch = searchTerm && searchResults.length === 0
    
    return (
      <Card className="p-8">
        <CardContent className="text-center space-y-4">
          {isEmptySearch ? (
            <>
              <Search className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-muted-foreground">
                  No tabs match &quot;{searchTerm}&quot;. Try adjusting your search terms.
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
    )
  }

  return (
    <div className="space-y-4">
      {selectedTabs.size > 0 ? (
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-medium">
                  {selectedTabs.size} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelectedTabs}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {showingDiscarded ? (
                  <>
                    <Button size="sm" variant="outline" onClick={handleBulkKeep} className="touch-target">
                      <Heart className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="touch-target">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={handleBulkKeep} className="touch-target">
                      <Heart className="h-4 w-4 mr-1" />
                      Keep
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDiscard} className="touch-target">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Discard
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="touch-target">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All ({filteredTabs.length})
                </Button>
                {activeFilter === 'duplicates' && (
                  <Button variant="ghost" size="sm" onClick={handleSelectDuplicates} className="touch-target">
                    <CopyCheck className="h-4 w-4 mr-2" />
                    Select Duplicates
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Folders Dropdown */}
                {onFilterChange && (
                  <Select value={activeFilter} onValueChange={onFilterChange}>
                    <SelectTrigger className={`${isMobile ? 'w-[120px]' : 'w-[160px]'}`}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center">
                          <Archive className="h-4 w-4 mr-2" />
                          All Tabs
                        </span>
                      </SelectItem>
                      <SelectItem value="kept">
                        <span className="flex items-center">
                          <Heart className="h-4 w-4 mr-2" />
                          Kept
                        </span>
                      </SelectItem>
                      <SelectItem value="discarded">
                        <span className="flex items-center">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Discarded
                        </span>
                      </SelectItem>
                      <SelectItem value="duplicates">
                        <span className="flex items-center">
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicates
                        </span>
                      </SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          <span className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: folder.color || '#4B5563' }}
                            />
                            {folder.name}
                            <span className="ml-auto text-xs text-muted-foreground">
                              ({folderTabCounts[folder.id] || 0})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className={`${isMobile ? 'w-[140px]' : 'w-[180px]'}`}>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Newest first
                      </span>
                    </SelectItem>
                    <SelectItem value="date-asc">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Oldest first
                      </span>
                    </SelectItem>
                    <SelectItem value="title-asc">
                      <span className="flex items-center">
                        <Type className="h-4 w-4 mr-2" />
                        Title A-Z
                      </span>
                    </SelectItem>
                    <SelectItem value="title-desc">
                      <span className="flex items-center">
                        <Type className="h-4 w-4 mr-2" />
                        Title Z-A
                      </span>
                    </SelectItem>
                    <SelectItem value="domain-asc">
                      <span className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Domain A-Z
                      </span>
                    </SelectItem>
                    <SelectItem value="domain-desc">
                      <span className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Domain Z-A
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Thumbnail Size Control */}
                <Select value={thumbnailSize} onValueChange={(value: any) => setThumbnailSize(value)}>
                  <SelectTrigger className={`${isMobile ? 'w-[100px]' : 'w-[120px]'}`}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Size..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">
                      <span className="flex items-center">
                        <Minimize2 className="h-4 w-4 mr-2" />
                        Small
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center">
                        <Grid2X2 className="h-4 w-4 mr-2" />
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="large">
                      <span className="flex items-center">
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Large
                      </span>
                    </SelectItem>
                    <SelectItem value="list">
                      <span className="flex items-center">
                        <List className="h-4 w-4 mr-2" />
                        List
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {filteredTabs.length > 0 && (
                  <Badge variant="outline">
                    {filteredTabs.length} tab{filteredTabs.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div 
        className={`h-[calc(100vh-300px)] overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background ${getGridClass()}`}
        style={{ paddingBottom: isMobile ? '80px' : '20px' }}
      >
        <div className={thumbnailSize === 'list' ? 'space-y-2 p-2' : 'tab-grid p-4'}>
          <AnimatePresence>
            {filteredTabs.map((tab) => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <TabCard
                  tab={tab}
                  isSelected={isTabSelected(tab.id)}
                  onToggleSelect={() => toggleTabSelection(tab.id)}
                  onKeep={keepTab}
                  onDiscard={showingDiscarded ? deleteTab : discardTab}
                  onDelete={deleteTab}
                  onAssignToFolder={assignToFolder}
                  onCreateFolderAndAssign={handleCreateFolderAndAssign}
                  onDragStart={setDraggedTab}
                  onDragEnd={() => setDraggedTab(null)}
                  showActions={true}
                  searchTerm={searchTerm}
                  thumbnailSize={thumbnailSize}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}


