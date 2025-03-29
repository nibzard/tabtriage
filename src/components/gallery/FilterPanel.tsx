'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface FilterPanelProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  tabCounts: {
    all: number
    kept: number
    discarded: number
    news: number
    shopping: number
    reference: number
    social: number
    entertainment: number
    [key: string]: number
  }
  searchTerm?: string
  onSearchChange?: (term: string) => void
}

export function FilterPanel({ 
  activeFilter, 
  onFilterChange, 
  tabCounts,
  searchTerm = '',
  onSearchChange
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [categoryExpanded, setCategoryExpanded] = useState(false)

  const filters = [
    { id: 'all', name: 'All Tabs', count: tabCounts.all },
    { id: 'kept', name: 'Kept', count: tabCounts.kept },
    { id: 'discarded', name: 'Discarded', count: tabCounts.discarded },
  ]

  const categories = [
    { id: 'news', name: 'News', count: tabCounts.news },
    { id: 'shopping', name: 'Shopping', count: tabCounts.shopping },
    { id: 'reference', name: 'Reference', count: tabCounts.reference },
    { id: 'social', name: 'Social Media', count: tabCounts.social },
    { id: 'entertainment', name: 'Entertainment', count: tabCounts.entertainment },
  ].filter(category => category.count > 0) // Only show categories with tabs

  // Simplified view on mobile/collapsed state
  if (!isExpanded) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
        <div className="p-3 flex items-center justify-between">
          <div className="flex space-x-2">
            {/* Search Field - Always visible */}
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search tabs..."
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full px-3 py-2 pl-8 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Quick Status Filter Buttons */}
            <div className="flex space-x-1">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  className={`px-3 py-2 rounded-md text-xs font-medium ${
                    activeFilter === filter.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {filter.name}
                  {filter.count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 text-xs">
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Expand Button */}
          <button 
            onClick={() => setIsExpanded(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            aria-label="Expand filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Expanded view
  return (
    <motion.div 
      initial={{ height: 80 }}
      animate={{ height: 'auto' }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-medium text-gray-900 dark:text-white">Filters</h2>
        <button 
          onClick={() => setIsExpanded(false)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label="Collapse filters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Box */}
      {onSearchChange && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tabs..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 pl-8 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-900 dark:text-white"
            />
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => onSearchChange?.('')}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Status Filters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
                  activeFilter === filter.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <span>{filter.name}</span>
                {filter.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    activeFilter === filter.id
                      ? 'bg-primary-200 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                      : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters - Only show if there are categories with tabs */}
        {categories.length > 0 && (
          <div>
            <div 
              className="flex items-center justify-between mb-2 cursor-pointer"
              onClick={() => setCategoryExpanded(!categoryExpanded)}
            >
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Categories</h3>
              <button className="text-gray-500 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${categoryExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {categoryExpanded && (
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => onFilterChange(category.id)}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
                      activeFilter === category.id
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{category.name}</span>
                    {category.count > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                        activeFilter === category.id
                          ? 'bg-primary-200 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                          : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {category.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}