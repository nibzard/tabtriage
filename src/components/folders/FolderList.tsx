'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Folder } from '@/types/Folder'
import toast from 'react-hot-toast'

interface FolderListProps {
  folders: Folder[]
  selectedFolderId: string
  onSelectFolder: (folderId: string) => void
  tabCounts: Record<string, number>
  onCreateFolder?: () => void
  onDeleteFolder?: () => void
  searchTerm?: string
  onSearchChange?: (term: string) => void
}

export function FolderList({ 
  folders, 
  selectedFolderId, 
  onSelectFolder, 
  tabCounts, 
  onCreateFolder,
  onDeleteFolder,
  searchTerm = '',
  onSearchChange
}: FolderListProps) {
  const totalTabs = Object.values(tabCounts).reduce((sum, count) => sum + count, 0)
  const unorganizedTabs = folders.length > 0 ? 0 : totalTabs

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Folders</h2>
        <div className="flex space-x-2">
          {onCreateFolder && (
            <button 
              onClick={onCreateFolder}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              title="Add folder"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
          {onDeleteFolder && selectedFolderId && (
            <button 
              onClick={onDeleteFolder}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="Delete folder"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search Box */}
      {onSearchChange && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search in folder..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
          />
        </div>
      )}

      <ul className="space-y-1">
        {folders.map(folder => (
          <li key={folder.id}>
            <button
              onClick={() => onSelectFolder(folder.id)}
              className={`w-full flex justify-between items-center px-3 py-2 text-sm rounded-md ${
                selectedFolderId === folder.id
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: folder.color || '#4B5563' }}
                ></span>
                <span>{folder.name}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                selectedFolderId === folder.id
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {tabCounts[folder.id] || 0}
              </span>
            </button>
          </li>
        ))}
        
        {/* Only show unorganized section if there are tabs without folders */}
        {unorganizedTabs > 0 && (
          <li>
            <button
              onClick={() => onSelectFolder('')}
              className={`w-full flex justify-between items-center px-3 py-2 text-sm rounded-md ${
                selectedFolderId === ''
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Unorganized</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                selectedFolderId === ''
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {unorganizedTabs}
              </span>
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}