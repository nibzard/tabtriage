'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tab } from '@/types/Tab'
import { tabApi } from '@/utils/api-client'
import { logger } from '@/utils/logger'
import { generateUUID } from '@/utils/uuid'
import { ensureSession } from '@/utils/auth-helper'

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
  const [hasSession, setHasSession] = useState(false);
  
  // Ensure we have a valid session
  useEffect(() => {
    const initSession = async () => {
      try {
        await ensureSession();
        setHasSession(true);
        logger.info('User session initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize user session:', error);
        // Note: No localStorage fallback - rely on database only
      }
    };
    
    initSession();
  }, [queryClient]);
  
  // Use React Query for server state management
  const { data: tabs = [], isLoading, isError: isTabsFetchError } = useQuery({
    queryKey: ['tabs'],
    queryFn: tabApi.getTabs,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2, // Retry failed requests twice
    enabled: hasSession, // Only run the query when we have a session
    onError: (error) => {
      logger.error('Error fetching tabs from API:', error)
    }
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
    
    // Filter out duplicates based on URL with more strict matching
    const existingUrls = new Map(tabs.map(tab => [tab.url.toLowerCase().trim(), tab.id]))
    
    // Make sure we don't add the same tab twice in this batch either
    const processedUrls = new Set<string>()
    
    const uniqueNewTabs = newTabs.filter(tab => {
      const normalizedUrl = tab.url.toLowerCase().trim()
      
      // If we already processed this URL in this batch, skip it
      if (processedUrls.has(normalizedUrl)) {
        return false
      }
      
      // If this URL already exists in the tabs, skip it
      if (existingUrls.has(normalizedUrl)) {
        return false
      }
      
      // Mark this URL as processed for this batch
      processedUrls.add(normalizedUrl)
      return true
    })
    
    if (uniqueNewTabs.length === 0) {
      logger.info('No unique tabs to add')
      return
    }
    
    logger.info(`${uniqueNewTabs.length} unique tabs will be added`)
    
    try {
      // Save tabs to the server
      const savePromises = uniqueNewTabs.map(tab => saveTabMutation.mutateAsync(tab))
      await Promise.all(savePromises)
      
      // Update UI after successful server save
      logger.info(`All ${uniqueNewTabs.length} tabs saved successfully. Refreshing data.`)
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
    } catch (error) {
      logger.error('Error saving tabs to server:', error)
      throw error // Re-throw to let caller handle
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
    saveTabMutation.mutate({ ...tab, ...updates }, {
      onError: (error) => {
        logger.error(`Failed to save tab ${tabId} to server:`, error);
      }
    });
  }, [tabs, queryClient, saveTabMutation])
  
  // Delete a tab
  const deleteTab = useCallback((tabId: string) => {
    logger.debug(`Deleting tab: ${tabId}`)
    
    // Optimistically update the UI
    queryClient.setQueryData(['tabs'], (oldTabs: Tab[] = []) => 
      oldTabs.filter(tab => tab.id !== tabId)
    )
    
    // Delete the tab from the server
    deleteTabMutation.mutate(tabId, {
      onError: (error) => {
        logger.error(`Failed to delete tab ${tabId} from server:`, error);
      }
    });
  }, [tabs, queryClient, deleteTabMutation])
  
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
      deleteTabMutation.mutate(tab.id, {
        onError: (error) => {
          logger.error(`Failed to delete discarded tab ${tab.id} from server:`, error);
        }
      });
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
