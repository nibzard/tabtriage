'use client'

import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Folder } from '@/types/Folder'
import { Tab } from '@/types/Tab'

interface FolderContentProps {
  folder?: Folder
  tabs: Tab[]
  onDiscardTab: (tabId: string) => void
  onDeleteTab: (tabId: string) => void
}

export function FolderContent({ folder, tabs, onDiscardTab, onDeleteTab }: FolderContentProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'date', 'title', 'domain'

  // Filter tabs by search query
  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.summary.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort tabs
  const sortedTabs = [...filteredTabs].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    } else if (sortBy === 'title') {
      return a.title.localeCompare(b.title)
    } else if (sortBy === 'domain') {
      return a.domain.localeCompare(b.domain)
    }
    return 0
  })

  if (tabs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          No tabs in this folder
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          {folder ? `Assign tabs to the "${folder.name}" folder to see them here.` : 'Assign tabs to a folder to organize them.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Folder Title */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            {folder && (
              <span
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: folder.color || '#4B5563' }}
              ></span>
            )}
            {folder ? folder.name : 'Unorganized Tabs'} 
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'})
            </span>
          </h2>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div>
              <input
                type="text"
                placeholder="Search in folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="domain">Sort by Domain</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tab List */}
      <div className="space-y-4">
        {sortedTabs.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            No tabs match your search criteria
          </p>
        ) : (
          <div className="space-y-4">
            {sortedTabs.map(tab => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Tab Screenshot */}
                  {tab.screenshot && (
                    <div className="sm:w-40 h-32 sm:h-auto overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      <Image
                        src={tab.screenshot}
                        alt={tab.title}
                        width={160}
                        height={120}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Tab Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-1">
                        {tab.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{tab.domain}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {tab.summary || 'No summary available.'}
                      </p>
                      
                      {/* Tags */}
                      {tab.tags && tab.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tab.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Tab Actions */}
                    <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <a
                        href={tab.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                      >
                        Open Tab
                      </a>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onDiscardTab(tab.id)}
                          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 text-sm"
                        >
                          Move to Discarded
                        </button>
                        <button
                          onClick={() => onDeleteTab(tab.id)}
                          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}