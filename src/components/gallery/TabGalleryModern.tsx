'use client'

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  Filter
} from 'lucide-react'

interface TabGalleryModernProps {
  activeFilter: string
  searchTerm: string
  searchResults: Tab[]
  isSearching: boolean
  showingDiscarded: boolean
}

export function TabGalleryModern({
  activeFilter,
  searchTerm,
  searchResults,
  isSearching,
  showingDiscarded
}: TabGalleryModernProps) {
  const { tabs, keepTab, discardTab, deleteTab, assignToFolder, createFolder } = useTabs()
  const { 
    selectedTabs, 
    isTabSelected, 
    toggleTabSelection, 
    selectAllTabs, 
    clearSelectedTabs 
  } = useBulkActions()
  const { isMobile } = useResponsive()
  const parentRef = useRef<HTMLDivElement>(null)
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null)

  const filteredTabs = useMemo(() => {
    if (searchTerm && searchResults.length > 0) {
      return searchResults
    }
    return tabs.filter(tab => {
      if (activeFilter === 'all') return tab.status === 'unprocessed'
      if (activeFilter === 'kept') return tab.status === 'kept'
      if (activeFilter === 'discarded') return tab.status === 'discarded'
      const categoryMatch = tab.category === activeFilter && tab.status === 'unprocessed'
      return categoryMatch
    })
  }, [tabs, activeFilter, searchTerm, searchResults])

  const getColumnCount = () => {
    if (typeof window === 'undefined') return 1
    const width = window.innerWidth
    if (width < 640) return 1
    if (width < 1024) return 2
    if (width < 1536) return 3
    return 4
  }

  const columnCount = getColumnCount()

  const rows = useMemo(() => {
    const result: Tab[][] = []
    for (let i = 0; i < filteredTabs.length; i += columnCount) {
      result.push(filteredTabs.slice(i, i + columnCount))
    }
    return result
  }, [filteredTabs, columnCount])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isMobile ? 320 : 280,
    overscan: 3,
  })

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="touch-target">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All ({filteredTabs.length})
                </Button>
              </div>
              
              {filteredTabs.length > 0 && (
                <Badge variant="outline">
                  {filteredTabs.length} tab{filteredTabs.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div
        ref={parentRef}
        className="h-[calc(100vh-300px)] overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background"
        style={{ paddingBottom: isMobile ? '80px' : '20px' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          <AnimatePresence>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowTabs = rows[virtualRow.index]
              if (!rowTabs) return null

              return (
                <motion.div
                  key={virtualRow.index}
                  layout
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className={`grid gap-4 p-2 ${isMobile ? 'mobile-grid-1' : 'mobile-grid'}`}>
                    {rowTabs.map((tab) => (
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
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
