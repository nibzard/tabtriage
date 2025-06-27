import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Folder } from '@/types/Folder'
import { folderApi } from '@/utils/api-client'
import { logger } from '@/utils/logger'
import { generateUUID } from '@/utils/uuid'

/**
 * React Query hook for managing folders with automatic caching and optimistic updates
 */
export function useFolders() {
  const queryClient = useQueryClient()

  // Query for fetching all folders
  const {
    data: folders = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      try {
        return await folderApi.getFolders()
      } catch (error) {
        logger.warn('Failed to fetch folders from server:', error)
        // Return empty array as fallback since folders are less critical
        return []
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  // Mutation for saving/updating folders
  const saveFolderMutation = useMutation({
    mutationFn: async (folder: Folder) => {
      return await folderApi.saveFolder(folder)
    },
    onMutate: async (newFolder) => {
      await queryClient.cancelQueries({ queryKey: ['folders'] })
      const previousFolders = queryClient.getQueryData<Folder[]>(['folders'])

      queryClient.setQueryData<Folder[]>(['folders'], (old = []) => {
        const existingIndex = old.findIndex(folder => folder.id === newFolder.id)
        if (existingIndex >= 0) {
          const updated = [...old]
          updated[existingIndex] = newFolder
          return updated
        } else {
          return [...old, newFolder]
        }
      })

      return { previousFolders }
    },
    onError: (err, newFolder, context) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(['folders'], context.previousFolders)
      }
      logger.error('Failed to save folder:', err)
    },
    onSuccess: (data, variables) => {
      logger.debug(`Successfully saved folder ${variables.id}`)
    },
  })

  // Mutation for deleting folders
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return await folderApi.deleteFolder(folderId)
    },
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: ['folders'] })
      const previousFolders = queryClient.getQueryData<Folder[]>(['folders'])

      queryClient.setQueryData<Folder[]>(['folders'], (old = []) =>
        old.filter(folder => folder.id !== folderId)
      )

      // Also update tabs that were in this folder
      queryClient.setQueryData<any[]>(['tabs'], (old = []) =>
        old.map(tab => 
          tab.folderId === folderId 
            ? { ...tab, folderId: undefined }
            : tab
        )
      )

      return { previousFolders }
    },
    onError: (err, folderId, context) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(['folders'], context.previousFolders)
      }
      logger.error('Failed to delete folder:', err)
    },
    onSuccess: () => {
      // Invalidate tabs to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
    },
  })

  // Helper functions
  const createFolder = async (name: string, color?: string): Promise<Folder> => {
    const newFolder: Folder = {
      id: generateUUID(),
      name,
      color: color || generateRandomColor(),
    }

    await saveFolderMutation.mutateAsync(newFolder)
    return newFolder
  }

  const updateFolder = (folderId: string, updates: Partial<Folder>) => {
    const currentFolders = queryClient.getQueryData<Folder[]>(['folders']) || []
    const folder = currentFolders.find(f => f.id === folderId)
    if (folder) {
      const updatedFolder = { ...folder, ...updates }
      saveFolderMutation.mutate(updatedFolder)
    }
  }

  const deleteFolder = (folderId: string) => {
    deleteFolderMutation.mutate(folderId)
  }

  return {
    // Data
    folders,
    isLoading,
    error,

    // Actions
    createFolder,
    updateFolder,
    deleteFolder,
    refetch,

    // Mutation states
    isSaving: saveFolderMutation.isLoading,
    isDeleting: deleteFolderMutation.isLoading,

    // Raw mutations for advanced use cases
    saveFolderMutation,
    deleteFolderMutation,
  }
}

/**
 * Generate a random color for folders
 */
function generateRandomColor(): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}