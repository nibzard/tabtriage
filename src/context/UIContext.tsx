'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface UIContextType {
  expandedTabId: string | null
  selectedTabs: Set<string>
  bulkActionMenuOpen: boolean
  folderMenuOpen: boolean
  setExpandedTabId: (tabId: string | null) => void
  toggleExpand: (tabId: string) => void
  toggleTabSelection: (tabId: string) => void
  selectAllTabs: (tabIds: string[]) => void
  clearSelectedTabs: () => void
  setBulkActionMenuOpen: (isOpen: boolean) => void
  setFolderMenuOpen: (isOpen: boolean) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null)
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set())
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false)
  const [folderMenuOpen, setFolderMenuOpen] = useState(false)
  
  // Toggle tab expansion
  const toggleExpand = useCallback((tabId: string) => {
    setExpandedTabId(prevId => (prevId === tabId ? null : tabId))
  }, [])
  
  // Toggle tab selection
  const toggleTabSelection = useCallback((tabId: string) => {
    setSelectedTabs(prevSelected => {
      const newSelection = new Set(prevSelected)
      if (newSelection.has(tabId)) {
        newSelection.delete(tabId)
      } else {
        newSelection.add(tabId)
      }
      return newSelection
    })
  }, [])
  
  // Select all tabs or clear selection if all are already selected
  const selectAllTabs = useCallback((tabIds: string[]) => {
    setSelectedTabs(prevSelected => {
      if (tabIds.length > 0 && tabIds.every(id => prevSelected.has(id))) {
        // All are selected, so clear the selection
        return new Set()
      }
      // Select all
      return new Set(tabIds)
    })
  }, [])
  
  // Clear all selected tabs
  const clearSelectedTabs = useCallback(() => {
    setSelectedTabs(new Set())
  }, [])
  
  return (
    <UIContext.Provider
      value={{
        expandedTabId,
        selectedTabs,
        bulkActionMenuOpen,
        folderMenuOpen,
        setExpandedTabId,
        toggleExpand,
        toggleTabSelection,
        selectAllTabs,
        clearSelectedTabs,
        setBulkActionMenuOpen,
        setFolderMenuOpen,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUIContext() {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIProvider')
  }
  return context
}
