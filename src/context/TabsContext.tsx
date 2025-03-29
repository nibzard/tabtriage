'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tab } from '@/types/Tab'
import { tabApi } from '@/utils/api-client'
import { logger } from '@/utils/logger'
import { generateUUID } from '@/utils/uuid'

interface TabsContextType {
  tabs: Tab[]
  isLoading: boolean
  addTabs: (newTabs: Tab[]) => void
  updateTab: (tabId: string, updates: Partial<Tab>) => void
  deleteTab: (tabId: string) => void
  deleteAllDiscarded: () => void
  keepTab: (tabId: string) => void
  discardTab: (tabId: string) => void
  assignToFolder: (tabId: string, folderId: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

export function TabsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  
  // Use React Query for server state management
  const { data: tabs = [], isLoading } = useQuery({
    queryKey: ['tabs'],
    queryFn: tabApi.getTabs,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
  
  // Save tab mutation with batched invalidation
  const saveTabMutation = useMutation({
    mutationFn: tabApi.saveTab,
    // We'll manually invalidate after all saves are complete
    // to prevent multiple re-renders during batch operations
  })
  
  // Delete tab mutation
  const deleteTabMutation = useMutation({
    mutationFn: tabApi.deleteTab,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
    },
  })
  
  // Add multiple tabs
  const addTabs = useCallback(async (newTabs: Tab[]) => {
    logger.info(`Adding ${newTabs.length} new tabs`)
    
    // Filter out duplicates based on URL
    const existingUrls = new Set(tabs.map(tab => tab.url))
    const uniqueNewTabs = newTabs.filter(tab => !existingUrls.has(tab.url))
    
    if (uniqueNewTabs.length === 0) {
      logger.info('No unique tabs to add')
      return
    }
    
    logger.info(`${uniqueNewTabs.length} unique tabs will be added`)
    
    // Optimistically update the UI once - prevents multiple renders
    queryClient.setQueryData(['tabs'], (oldTabs: Tab[] = []) => [
      ...oldTabs,
      ...uniqueNewTabs,
    ])
    
    try {
      // Save tabs to the server with Promise.all for better performance
      const savePromises = uniqueNewTabs.map(tab => saveTabMutation.mutateAsync(tab))
      await Promise.all(savePromises)
      
      // Now that all tabs are saved, invalidate the query once
      logger.info(`All ${uniqueNewTabs.length} tabs saved successfully. Refreshing data.`)
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
    } catch (error) {
      logger.error('Error saving tabs:', error)
      // Still invalidate to ensure UI is consistent
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
    }
  }, [tabs, queryClient, saveTabMutation])
  
  // Update a tab
  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    logger.debug(`Updating tab: ${tabId}`, updates)
    
    // Optimistically update the UI
    queryClient.setQueryData(['tabs'], (oldTabs: Tab[] = []) => 
      oldTabs.map(tab => tab.id === tabId ? { ...tab, ...updates } : tab)
    )
    
    // Get the full tab data
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) {
      logger.error(`Tab not found: ${tabId}`)
      return
    }
    
    // Save the updated tab to the server
    saveTabMutation.mutate({ ...tab, ...updates })
  }, [tabs, queryClient, saveTabMutation])
  
  // Delete a tab
  const deleteTab = useCallback((tabId: string) => {
    logger.debug(`Deleting tab: ${tabId}`)
    
    // Optimistically update the UI
    queryClient.setQueryData(['tabs'], (oldTabs: Tab[] = []) => 
      oldTabs.filter(tab => tab.id !== tabId)
    )
    
    // Delete the tab from the server
    deleteTabMutation.mutate(tabId)
  }, [queryClient, deleteTabMutation])
  
  // Delete all discarded tabs
  const deleteAllDiscarded = useCallback(() => {
    logger.debug('Deleting all discarded tabs')
    
    const discardedTabs = tabs.filter(tab => tab.status === 'discarded')
    
    // Optimistically update the UI
    queryClient.setQueryData(['tabs'], (oldTabs: Tab[] = []) => 
      oldTabs.filter(tab => tab.status !== 'discarded')
    )
    
    // Delete each discarded tab from the server
    discardedTabs.forEach(tab => {
      deleteTabMutation.mutate(tab.id)
    })
  }, [tabs, queryClient, deleteTabMutation])
  
  // Mark a tab as kept
  const keepTab = useCallback((tabId: string) => {
    updateTab(tabId, { status: 'kept' })
  }, [updateTab])
  
  // Mark a tab as discarded
  const discardTab = useCallback((tabId: string) => {
    updateTab(tabId, { status: 'discarded' })
  }, [updateTab])
  
  // Assign a tab to a folder
  const assignToFolder = useCallback((tabId: string, folderId: string) => {
    updateTab(tabId, { folderId, status: 'kept' })
  }, [updateTab])
  
  return (
    <TabsContext.Provider
      value={{
        tabs,
        isLoading,
        addTabs,
        updateTab,
        deleteTab,
        deleteAllDiscarded,
        keepTab,
        discardTab,
        assignToFolder,
      }}
    >
      {children}
    </TabsContext.Provider>
  )
}

export function useTabsContext() {
  const context = useContext(TabsContext)
  if (context === undefined) {
    throw new Error('useTabsContext must be used within a TabsProvider')
  }
  return context
}
