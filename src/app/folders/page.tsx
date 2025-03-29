'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { FolderList } from '@/components/folders/FolderList'
import { FolderContent } from '@/components/folders/FolderContent'
import { useTabsContext } from '@/context/TabsContext'
import { useFoldersContext } from '@/context/FoldersContext'
import Link from 'next/link'

export default function FoldersPage() {
  const { tabs, keepTab, discardTab, deleteTab } = useTabsContext()
  const { folders, createFolder, deleteFolder } = useFoldersContext()
  const [selectedFolderId, setSelectedFolderId] = useState(folders[0]?.id || '')
  const [searchTerm, setSearchTerm] = useState('')

  // Get tabs for the selected folder
  const folderTabs = tabs.filter(tab => {
    // Filter by folder
    const inSelectedFolder = tab.folderId === selectedFolderId && tab.status === 'kept'
    
    // Filter by search term if provided
    if (searchTerm && inSelectedFolder) {
      const searchLower = searchTerm.toLowerCase()
      return (
        tab.title.toLowerCase().includes(searchLower) ||
        tab.url.toLowerCase().includes(searchLower) ||
        tab.summary.toLowerCase().includes(searchLower) ||
        tab.category.toLowerCase().includes(searchLower) ||
        tab.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    return inSelectedFolder
  })

  // Calculate tab counts for each folder
  const tabCounts = folders.reduce((acc, folder) => {
    acc[folder.id] = tabs.filter(tab => tab.folderId === folder.id && tab.status === 'kept').length
    return acc
  }, {} as Record<string, number>)

  // Create a new folder
  const handleCreateFolder = async () => {
    const folderName = prompt('Enter a name for the new folder:')
    if (folderName) {
      try {
        const newFolder = await createFolder(folderName)
        setSelectedFolderId(newFolder.id)
      } catch (error) {
        console.error('Error creating folder:', error)
        alert('Failed to create folder. Please try again.')
      }
    }
  }

  // Handle folder deletion
  const handleDeleteFolder = () => {
    if (selectedFolderId && confirm(`Are you sure you want to delete this folder? Tabs will be moved to the Unorganized section.`)) {
      deleteFolder(selectedFolderId)
      setSelectedFolderId(folders[0]?.id || '')
    }
  }

  // Handle tab deletion
  const handleDeleteTab = (tabId: string) => {
    if (confirm('Are you sure you want to permanently delete this tab? This action cannot be undone.')) {
      deleteTab(tabId)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Folders</h1>
          <button
            onClick={handleCreateFolder}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            New Folder
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No folders created yet</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Create your first folder to start organizing your tabs.
            </p>
            <button
              onClick={handleCreateFolder}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create Folder
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/4 lg:w-1/5">
              <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                tabCounts={tabCounts}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>

            <div className="md:w-3/4 lg:w-4/5">
              {selectedFolderId ? (
                <FolderContent
                  folder={folders.find(f => f.id === selectedFolderId)}
                  tabs={folderTabs}
                  onDiscardTab={discardTab}
                  onDeleteTab={handleDeleteTab}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-300">
                    Select a folder to view its contents
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}