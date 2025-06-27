import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tab } from '@/types/Tab'
import { tabApi } from '@/utils/api-client'
import { logger } from '@/utils/logger'
import { getTabs as getLocalTabs, saveTabs as saveLocalTabs } from '@/services/tabService'

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
      try {
        // The API route will handle session checks
        return await tabApi.getTabs()
      } catch (error) {
        logger.warn('Failed to fetch tabs from server, using local storage:', error)
        // Fallback to local storage
        const localTabs = getLocalTabs()
        return localTabs.map(tab => ({
          ...tab,
          fullScreenshot: tab.fullScreenshot || undefined,
        }))
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  })

  // Mutation for saving/updating tabs
  const saveTabMutation = useMutation({
    mutationFn: async (tab: Tab) => {
      try {
        return await tabApi.saveTab(tab)
      } catch (error) {
        logger.warn('Failed to save tab to server, saving locally:', error)
        // Fallback to local storage
        const currentTabs = queryClient.getQueryData<Tab[]>(['tabs']) || []
        const updatedTabs = currentTabs.map(t => t.id === tab.id ? tab : t)
        if (!currentTabs.find(t => t.id === tab.id)) {
          updatedTabs.push(tab)
        }
        saveLocalTabs(updatedTabs)
        return { success: true, id: tab.id }
      }
    },
    onMutate: async (newTab) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tabs'] })

      // Snapshot the previous value
      const previousTabs = queryClient.getQueryData<Tab[]>(['tabs'])

      // Optimistically update the cache
      queryClient.setQueryData<Tab[]>(['tabs'], (old = []) => {
        const existingIndex = old.findIndex(tab => tab.id === newTab.id)
        if (existingIndex >= 0) {
          // Update existing tab
          const updated = [...old]
          updated[existingIndex] = newTab
          return updated
        } else {
          // Add new tab
          return [...old, newTab]
        }
      })

      return { previousTabs }
    },
    onError: (err, newTab, context) => {
      // Rollback on error
      if (context?.previousTabs) {
        queryClient.setQueryData(['tabs'], context.previousTabs)
      }
      logger.error('Failed to save tab:', err)
    },
    onSuccess: (data, variables) => {
      logger.debug(`Successfully saved tab ${variables.id}`)
    },
  })

  // Mutation for deleting tabs
  const deleteTabMutation = useMutation({
    mutationFn: async (tabId: string) => {
      try {
        return await tabApi.deleteTab(tabId)
      } catch (error) {
        logger.warn('Failed to delete tab from server, deleting locally:', error)
        // Fallback to local storage
        const currentTabs = queryClient.getQueryData<Tab[]>(['tabs']) || []
        const updatedTabs = currentTabs.filter(t => t.id !== tabId)
        saveLocalTabs(updatedTabs)
        return { success: true }
      }
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
    updateTab(tabId, { folderId })
  }

  const deleteAllDiscarded = () => {
    const discardedTabs = tabs.filter(tab => tab.status === 'discarded')
    discardedTabs.forEach(tab => {
      deleteTabMutation.mutate(tab.id)
    })
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