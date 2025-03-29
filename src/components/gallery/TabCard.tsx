'use client'

import { memo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Tab } from '@/types/Tab'
import { useFoldersContext } from '@/context/FoldersContext'

interface TabCardProps {
  tab: Tab
  isExpanded: boolean
  onToggleExpand: () => void
  onKeep: () => void
  onDiscard: () => void
  onAssignFolder: (folderId: string) => void
}

export const TabCard = memo(function TabCard({
  tab,
  isExpanded,
  onToggleExpand,
  onKeep,
  onDiscard,
  onAssignFolder,
}: TabCardProps) {
  const { folders } = useFoldersContext()
  
  // Get folder name if tab is assigned to a folder
  const folder = tab.folderId ? folders.find(f => f.id === tab.folderId) : null
  
  return (
    <motion.div 
      layout
      initial={{ scale: 0.98, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col h-full transform transition-transform 
                 ${tab.status === 'discarded' ? 'border-l-4 border-l-red-500' : 
                   tab.status === 'kept' ? 'border-l-4 border-l-green-500' : ''}`}
    >
      {/* Screenshot/Header - Larger and more prominent */}
      <div className="relative">
        {tab.screenshot ? (
          <div className="relative h-40 overflow-hidden">
            {tab.screenshot.startsWith('data:') ? (
              // Handle data URLs directly with an img tag
              <img 
                src={tab.screenshot} 
                alt={tab.title}
                className="object-cover w-full h-full"
                onError={() => {
                  console.error(`Failed to load data URL image`)
                }}
              />
            ) : (
              // Use Next.js Image for URLs
              <Image
                src={tab.screenshot}
                alt={tab.title}
                width={400}
                height={225}
                className="object-cover w-full h-full"
                priority={false}
                loading="lazy"
                onError={() => {
                  console.error(`Failed to load image: ${tab.screenshot}`)
                }}
              />
            )}
            {/* Fallback in case of load error */}
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-gray-600 dark:text-gray-300 text-sm">{tab.domain || 'No domain'}</span>
            </div>
          </div>
        ) : (
          <div className="relative h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center mb-2">
                <span className="text-primary-600 dark:text-primary-300 text-xl font-bold">
                  {(tab.domain && tab.domain.charAt(0).toUpperCase()) || '?'}
                </span>
              </div>
              <span className="text-gray-600 dark:text-gray-300 text-sm">{tab.domain || 'No domain available'}</span>
            </div>
          </div>
        )}
        
        {/* Status badge */}
        {tab.status !== 'unprocessed' && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium text-white ${tab.status === 'kept' ? 'bg-green-500' : 'bg-red-500'}`}>
            {tab.status === 'kept' ? 'Kept' : 'Discarded'}
          </div>
        )}
        
        {/* Folder badge */}
        {folder && (
          <div 
            className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: folder.color || '#4B5563' }}
          >
            {folder.name}
          </div>
        )}
        
        {/* Category badge - New feature */}
        {tab.category && tab.category !== 'uncategorized' && !folder && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-700/70 text-white">
            {tab.category}
          </div>
        )}
      </div>

      {/* Content - Simplified */}
      <div className="p-3 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="text-base font-medium text-gray-900 dark:text-white line-clamp-1 mr-4 mb-1">
            {tab.title || 'Untitled'}
          </h3>
          <button
            onClick={onToggleExpand}
            className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            aria-label={isExpanded ? "Show less" : "Show more"}
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              {isExpanded ? (
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>

        {/* Only show the summary (more concise) */}
        {!isExpanded ? (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
            {tab.summary || 'No summary available.'}
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {tab.summary || 'No summary available.'}
              </p>
            </div>
            
            <div className="pt-2">
              <a 
                href={tab.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 block truncate"
              >
                {tab.url}
              </a>
            </div>
            
            {/* Tags */}
            {tab.tags && tab.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tab.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Suggested folders - Simplified */}
            {tab.suggestedFolders && tab.suggestedFolders.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Suggested:</p>
                <div className="flex flex-wrap gap-1">
                  {tab.suggestedFolders.slice(0, 3).map(folderId => {
                    const suggestedFolder = folders.find(f => f.id === folderId)
                    if (!suggestedFolder) return null
                    
                    return (
                      <button
                        key={folderId}
                        onClick={() => onAssignFolder(folderId)}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: suggestedFolder.color || '#4B5563',
                          color: 'white' 
                        }}
                      >
                        {suggestedFolder.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons - More prominent */}
      <div className="p-2 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onKeep}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium mr-2 transition-colors
                    ${tab.status === 'kept' 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-white text-gray-800 border border-gray-300 hover:bg-green-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-green-900/40 dark:border-gray-600'}`}
        >
          {tab.status === 'discarded' ? 'Restore' : 'Keep'}
        </button>
        
        <button
          onClick={onDiscard}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${tab.status === 'discarded' 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-white text-gray-800 border border-gray-300 hover:bg-red-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-red-900/40 dark:border-gray-600'}`}
        >
          {tab.status === 'discarded' ? 'Delete' : 'Discard'}
        </button>
      </div>
    </motion.div>
  )
})