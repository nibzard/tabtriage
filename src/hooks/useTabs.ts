import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tab } from '@/types/Tab'
import { tabApi } from '@/utils/api-client'
import { logger } from '@/utils/logger'

/**
 * React Query hook for managing tabs with automatic caching and optimistic updates
 */
export function useTabs() {
  const queryClient = useQueryClient()

  // Query for fetching all tabs
  const {
    data: tabs = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tabs'],
    queryFn: async () => {
      // Use API only - no localStorage fallback
      return await tabApi.getTabs()
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2, // Increased retry for better reliability
  })

  // Mutation for saving/updating tabs
  const saveTabMutation = useMutation({
    mutationFn: async (tab: Tab) => {
      // Use API only - no localStorage fallback
      return await tabApi.saveTab(tab)
    },
    onError: (err, newTab, context) => {
      logger.error('Failed to save tab:', err)
    },
    onSuccess: (data, variables) => {
      logger.debug(`Successfully saved tab ${variables.id}`)
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
      refetch()
    },
  })

  // Mutation for deleting tabs
  const deleteTabMutation = useMutation({
    mutationFn: async (tabId: string) => {
      // Use API only - no localStorage fallback
      return await tabApi.deleteTab(tabId)
    },
    onMutate: async (tabId) => {
      await queryClient.cancelQueries({ queryKey: ['tabs'] })
      const previousTabs = queryClient.getQueryData<Tab[]>(['tabs'])

      // Optimistically remove the tab
      queryClient.setQueryData<Tab[]>(['tabs'], (old = []) =>
        old.filter(tab => tab.id !== tabId)
      )

      return { previousTabs }
    },
    onError: (err, tabId, context) => {
      if (context?.previousTabs) {
        queryClient.setQueryData(['tabs'], context.previousTabs)
      }
      logger.error('Failed to delete tab:', err)
    },
  })

  // Mutation for batch operations
  const batchUpdateMutation = useMutation({
    mutationFn: async (updates: { tabId: string; updates: Partial<Tab> }[]) => {
      const results = []
      for (const { tabId, updates: tabUpdates } of updates) {
        const currentTabs = queryClient.getQueryData<Tab[]>(['tabs']) || []
        const tab = currentTabs.find(t => t.id === tabId)
        if (tab) {
          const updatedTab = { ...tab, ...tabUpdates }
          const result = await saveTabMutation.mutateAsync(updatedTab)
          results.push(result)
        }
      }
      return results
    },
  })

  // Helper functions
  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    const currentTabs = queryClient.getQueryData<Tab[]>(['tabs']) || []
    const tab = currentTabs.find(t => t.id === tabId)
    if (tab) {
      const updatedTab = { ...tab, ...updates }
      saveTabMutation.mutate(updatedTab)
    }
  }

  const addTabs = (newTabs: Tab[]) => {
    newTabs.forEach(tab => {
      saveTabMutation.mutate(tab)
    })
  }

  

  const deleteTab = (tabId: string) => {
    deleteTabMutation.mutate(tabId)
  }

  const keepTab = (tabId: string) => {
    updateTab(tabId, { status: 'kept' })
  }

  const discardTab = (tabId: string) => {
    updateTab(tabId, { status: 'discarded' })
  }

  const assignToFolder = (tabId: string, folderId: string) => {
    updateTab(tabId, { folderId, status: 'kept' })
  }

  const deleteAllDiscarded = () => {
    const discardedTabs = tabs.filter(tab => tab.status === 'discarded')
    discardedTabs.forEach(tab => {
      deleteTabMutation.mutate(tab.id)
    })
  }

  const findDuplicateTabs = () => {
    const urlMap = new Map<string, Tab[]>()
    tabs.forEach(tab => {
      const url = tab.url
      if (!urlMap.has(url)) {
        urlMap.set(url, [])
      }
      urlMap.get(url)!.push(tab)
    })

    const duplicates: Tab[] = []
    urlMap.forEach(tabs => {
      if (tabs.length > 1) {
        duplicates.push(...tabs)
      }
    })

    return duplicates
  }

  return {
    // Data
    tabs,
    isLoading,
    error,

    // Actions
    addTabs,
    updateTab,
    deleteTab,
    keepTab,
    discardTab,
    assignToFolder,
    deleteAllDiscarded,
    findDuplicateTabs,
    refetch,

    // Mutation states
    isSaving: saveTabMutation.isLoading,
    isDeleting: deleteTabMutation.isLoading,
    isBatchUpdating: batchUpdateMutation.isLoading,

    // Raw mutations for advanced use cases
    saveTabMutation,
    deleteTabMutation,
    batchUpdateMutation,
  }
}