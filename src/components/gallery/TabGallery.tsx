'use client'

import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tab } from '@/types/Tab'
import { TabCard } from './TabCard'
import { useTabsContext } from '@/context/TabsContext'
import { useFoldersContext } from '@/context/FoldersContext'
import { useUIContext } from '@/context/UIContext'
import { VirtualizedTabList } from './VirtualizedTabList'

interface TabGalleryProps {
  showingDiscarded?: boolean
  filterStatus?: 'all' | 'unprocessed' | 'kept' | 'discarded'
  filterFolder?: string
  searchTerm?: string
}

export const TabGallery = memo(function TabGallery({
  showingDiscarded = false,
  filterStatus = 'all',
  filterFolder,
  searchTerm = '',
}: TabGalleryProps) {
  // Context hooks
  const { 
    tabs, 
    keepTab, 
    discardTab, 
    assignToFolder, 
    deleteTab, 
    deleteAllDiscarded, 
    isLoading 
  } = useTabsContext()
  
  const { folders } = useFoldersContext()
  
  const {
    selectedTabs,
    expandedTabId,
    toggleExpand,
    toggleTabSelection,
    selectAllTabs,
    clearSelectedTabs,
    bulkActionMenuOpen,
    setBulkActionMenuOpen,
    folderMenuOpen,
    setFolderMenuOpen
  } = useUIContext()

  // Filter tabs based on criteria
  const filteredTabs = tabs.filter(tab => {
    // Filter by status
    if (filterStatus !== 'all' && tab.status !== filterStatus) {
      return false
    }
    
    // Filter by folder
    if (filterFolder && tab.folderId !== filterFolder) {
      return false
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        tab.title.toLowerCase().includes(searchLower) ||
        tab.url.toLowerCase().includes(searchLower) ||
        tab.summary.toLowerCase().includes(searchLower) ||
        tab.category.toLowerCase().includes(searchLower) ||
        tab.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    return true
  })

  // Bulk action handlers
  const bulkKeepTabs = () => {
    selectedTabs.forEach(tabId => keepTab(tabId))
    clearSelectedTabs()
    setBulkActionMenuOpen(false)
  }

  const bulkDiscardTabs = () => {
    selectedTabs.forEach(tabId => discardTab(tabId))
    clearSelectedTabs()
    setBulkActionMenuOpen(false)
  }

  const bulkAssignToFolder = (folderId: string) => {
    selectedTabs.forEach(tabId => assignToFolder(tabId, folderId))
    clearSelectedTabs()
    setFolderMenuOpen(false)
    setBulkActionMenuOpen(false)
  }

  const bulkDeleteTabs = () => {
    if (window.confirm(`Are you sure you want to permanently delete ${selectedTabs.size} selected tabs? This action cannot be undone.`)) {
      selectedTabs.forEach(tabId => deleteTab(tabId))
      clearSelectedTabs()
      setBulkActionMenuOpen(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading tabs...</p>
      </div>
    )
  }

  // If no tabs, show empty state
  if (filteredTabs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No tabs to display</h3>
        <p className="text-gray-600 dark:text-gray-300">
          Try changing your filter settings or import more tabs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Simplified Action Bar */}
      {selectedTabs.size > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedTabs.size === filteredTabs.length ? 
                `All ${selectedTabs.size} tabs selected` : 
                `${selectedTabs.size} ${selectedTabs.size === 1 ? 'tab' : 'tabs'} selected`}
            </span>
            <button 
              onClick={() => clearSelectedTabs()}
              className="ml-2 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action Buttons - More Direct */}
            {showingDiscarded ? (
              <>
                <button
                  onClick={bulkKeepTabs}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
                >
                  Restore Selected
                </button>
                <button
                  onClick={bulkDeleteTabs}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
                >
                  Delete Selected
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={bulkKeepTabs}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
                >
                  Keep Selected
                </button>
                <button
                  onClick={bulkDiscardTabs}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
                >
                  Discard Selected
                </button>
                
                {/* Simple Folder Dropdown */}
                {folders.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setFolderMenuOpen(!folderMenuOpen)}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md flex items-center"
                    >
                      <span>Move to Folder</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {folderMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10">
                        <div className="py-1 max-h-48 overflow-y-auto">
                          {folders.map(folder => (
                            <button
                              key={folder.id}
                              onClick={() => bulkAssignToFolder(folder.id)}
                              className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {folder.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        // Empty Selection - Show Select All Option and Delete All Discarded for that view
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 mb-4 flex flex-wrap items-center justify-between">
          <button
            onClick={() => selectAllTabs(filteredTabs.map(tab => tab.id))}
            className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Select All ({filteredTabs.length})
          </button>

          {/* Delete All Discarded button (only shown when viewing discarded tabs) */}
          {showingDiscarded && deleteAllDiscarded && filteredTabs.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to permanently delete all ${filteredTabs.length} discarded tabs? This action cannot be undone.`)) {
                  deleteAllDiscarded()
                }
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
            >
              Delete All
            </button>
          )}
        </div>
      )}

      {/* Tab Grid with virtualization */}
      <VirtualizedTabList 
        tabs={filteredTabs}
        selectedTabs={selectedTabs}
        expandedTabId={expandedTabId}
        onToggleExpand={toggleExpand}
        onToggleSelect={toggleTabSelection}
        onKeep={keepTab}
        onDiscard={discardTab}
        onAssignFolder={assignToFolder}
        onDeleteTab={showingDiscarded ? deleteTab : undefined}
        showingDiscarded={showingDiscarded}
      />
    </div>
  )
})