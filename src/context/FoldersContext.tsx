'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Folder } from '@/types/Folder'
import { folderApi } from '@/utils/api-client'
import { logger } from '@/utils/logger'

interface FoldersContextType {
  folders: Folder[]
  isLoading: boolean
  createFolder: (name: string) => Promise<Folder>
  updateFolder: (folderId: string, updates: Partial<Folder>) => void
  deleteFolder: (folderId: string) => void
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined)

export function FoldersProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  
  // Use React Query for server state management
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: folderApi.getFolders,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
  
  // Save folder mutation
  const saveFolderMutation = useMutation({
    mutationFn: folderApi.saveFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
  
  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: folderApi.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      // Also invalidate tabs since folder assignments may have changed
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
    },
  })
  
  // Create a new folder
  const createFolder = useCallback(async (name: string): Promise<Folder> => {
    logger.debug(`Creating new folder: ${name}`)
    
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 45%)`
    }
    
    // Optimistically update the UI
    queryClient.setQueryData(['folders'], (oldFolders: Folder[] = []) => [
      ...oldFolders,
      newFolder,
    ])
    
    // Save the folder to the server
    await saveFolderMutation.mutateAsync(newFolder)
    
    return newFolder
  }, [queryClient, saveFolderMutation])
  
  // Update a folder
  const updateFolder = useCallback((folderId: string, updates: Partial<Folder>) => {
    logger.debug(`Updating folder: ${folderId}`, updates)
    
    // Optimistically update the UI
    queryClient.setQueryData(['folders'], (oldFolders: Folder[] = []) => 
      oldFolders.map(folder => folder.id === folderId ? { ...folder, ...updates } : folder)
    )
    
    // Get the full folder data
    const folder = folders.find(f => f.id === folderId)
    if (!folder) {
      logger.error(`Folder not found: ${folderId}`)
      return
    }
    
    // Save the updated folder to the server
    saveFolderMutation.mutate({ ...folder, ...updates })
  }, [folders, queryClient, saveFolderMutation])
  
  // Delete a folder
  const deleteFolder = useCallback((folderId: string) => {
    logger.debug(`Deleting folder: ${folderId}`)
    
    // Optimistically update the UI
    queryClient.setQueryData(['folders'], (oldFolders: Folder[] = []) => 
      oldFolders.filter(folder => folder.id !== folderId)
    )
    
    // Delete the folder from the server
    deleteFolderMutation.mutate(folderId)
  }, [queryClient, deleteFolderMutation])
  
  return (
    <FoldersContext.Provider
      value={{
        folders,
        isLoading,
        createFolder,
        updateFolder,
        deleteFolder,
      }}
    >
      {children}
    </FoldersContext.Provider>
  )
}

export function useFoldersContext() {
  const context = useContext(FoldersContext)
  if (context === undefined) {
    throw new Error('useFoldersContext must be used within a FoldersProvider')
  }
  return context
}

// Safe version that returns default values if provider is not available
export function useFoldersContextSafe() {
  const context = useContext(FoldersContext)
  if (context === undefined) {
    return {
      folders: [],
      isLoading: false,
      createFolder: async () => ({ id: '', name: '', color: '' }),
      updateFolder: () => {},
      deleteFolder: () => {},
    }
  }
  return context
}
