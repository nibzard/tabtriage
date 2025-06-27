import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Tab selection and multi-select
  selectedTabs: Set<string>
  toggleTabSelection: (tabId: string) => void
  selectAllTabs: (tabIds: string[]) => void
  clearSelectedTabs: () => void
  isTabSelected: (tabId: string) => boolean
  selectedTabsCount: number

  // Expanded states
  expandedTabId: string | null
  toggleExpand: (tabId: string) => void
  clearExpanded: () => void

  // Menu states
  bulkActionMenuOpen: boolean
  setBulkActionMenuOpen: (open: boolean) => void
  folderMenuOpen: boolean
  setFolderMenuOpen: (open: boolean) => void

  // View preferences
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  gridColumns: number
  setGridColumns: (columns: number) => void

  // Filter and search state
  activeFilter: string
  setActiveFilter: (filter: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchMode: 'hybrid' | 'keyword' | 'semantic'
  setSearchMode: (mode: 'hybrid' | 'keyword' | 'semantic') => void

  // Loading states for UI feedback
  isImporting: boolean
  setIsImporting: (importing: boolean) => void
  importProgress: number
  setImportProgress: (progress: number) => void

  // Sidebar and layout
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isMobile: boolean
  setIsMobile: (mobile: boolean) => void
}

/**
 * Zustand store for UI state management
 * This handles all client-side UI state that doesn't need to be synchronized with the server
 */
export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      // Tab selection
      selectedTabs: new Set(),
      toggleTabSelection: (tabId: string) => set((state) => {
        const newSelectedTabs = new Set(state.selectedTabs)
        if (newSelectedTabs.has(tabId)) {
          newSelectedTabs.delete(tabId)
        } else {
          newSelectedTabs.add(tabId)
        }
        return { selectedTabs: newSelectedTabs }
      }),
      selectAllTabs: (tabIds: string[]) => set({ selectedTabs: new Set(tabIds) }),
      clearSelectedTabs: () => set({ selectedTabs: new Set() }),
      isTabSelected: (tabId: string) => get().selectedTabs.has(tabId),
      get selectedTabsCount() {
        return get().selectedTabs.size
      },

      // Expanded states
      expandedTabId: null,
      toggleExpand: (tabId: string) => set((state) => ({
        expandedTabId: state.expandedTabId === tabId ? null : tabId
      })),
      clearExpanded: () => set({ expandedTabId: null }),

      // Menu states
      bulkActionMenuOpen: false,
      setBulkActionMenuOpen: (open: boolean) => set({ bulkActionMenuOpen: open }),
      folderMenuOpen: false,
      setFolderMenuOpen: (open: boolean) => set({ folderMenuOpen: open }),

      // View preferences
      viewMode: 'grid',
      setViewMode: (mode: 'grid' | 'list') => set({ viewMode: mode }),
      gridColumns: 3,
      setGridColumns: (columns: number) => set({ gridColumns: Math.max(1, Math.min(6, columns)) }),

      // Filter and search
      activeFilter: 'all',
      setActiveFilter: (filter: string) => set({ activeFilter: filter }),
      searchTerm: '',
      setSearchTerm: (term: string) => set({ searchTerm: term }),
      searchMode: 'hybrid',
      setSearchMode: (mode: 'hybrid' | 'keyword' | 'semantic') => set({ searchMode: mode }),

      // Loading states
      isImporting: false,
      setIsImporting: (importing: boolean) => set({ isImporting: importing }),
      importProgress: 0,
      setImportProgress: (progress: number) => set({ importProgress: Math.max(0, Math.min(100, progress)) }),

      // Layout
      sidebarOpen: false,
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      isMobile: false,
      setIsMobile: (mobile: boolean) => set({ isMobile: mobile }),
    }),
    {
      name: 'tabtriage-ui-state',
      // Only persist certain UI preferences, not temporary states
      partialize: (state) => ({
        viewMode: state.viewMode,
        gridColumns: state.gridColumns,
        searchMode: state.searchMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)

/**
 * Hook for responsive design utilities
 */
export function useResponsive() {
  const { isMobile, setIsMobile } = useUI()

  // You can add window resize listeners here if needed
  // For now, we'll rely on CSS media queries and manual setting

  return {
    isMobile,
    setIsMobile,
  }
}

/**
 * Hook for search state management
 */
export function useSearch() {
  const {
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    activeFilter,
    setActiveFilter,
  } = useUI()

  const clearSearch = () => {
    setSearchTerm('')
    setActiveFilter('all')
  }

  return {
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    activeFilter,
    setActiveFilter,
    clearSearch,
  }
}

/**
 * Hook for bulk operations UI state
 */
export function useBulkActions() {
  const {
    selectedTabs,
    selectedTabsCount,
    toggleTabSelection,
    selectAllTabs,
    clearSelectedTabs,
    isTabSelected,
    bulkActionMenuOpen,
    setBulkActionMenuOpen,
  } = useUI()

  const hasSelectedTabs = selectedTabsCount > 0

  return {
    selectedTabs,
    selectedTabsCount,
    hasSelectedTabs,
    toggleTabSelection,
    selectAllTabs,
    clearSelectedTabs,
    isTabSelected,
    bulkActionMenuOpen,
    setBulkActionMenuOpen,
  }
}