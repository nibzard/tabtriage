'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { TabGallery } from '@/components/gallery/TabGallery'
import { FilterPanel } from '@/components/gallery/FilterPanel'
import { useTabsContext } from '@/context/TabsContext'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function GalleryPage() {
  // Use the new TabsContext
  const { tabs, keepTab, discardTab, assignToFolder, deleteTab, deleteAllDiscarded } = useTabsContext()
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter tabs based on active filter
  const getFilteredTabs = () => {
    return tabs.filter(tab => {
      // Status filter
      if (activeFilter === 'all') return tab.status === 'unprocessed'
      if (activeFilter === 'kept') return tab.status === 'kept'
      if (activeFilter === 'discarded') return tab.status === 'discarded'
      
      // Category filter
      const categoryMatch = tab.category === activeFilter && tab.status === 'unprocessed'
      
      return categoryMatch
    })
  }

  // Check if we're showing discarded tabs
  const showingDiscarded = activeFilter === 'discarded'

  // Calculate tab counts for each category
  const tabCounts = {
    all: tabs.filter(t => t.status === 'unprocessed').length,
    kept: tabs.filter(t => t.status === 'kept').length,
    discarded: tabs.filter(t => t.status === 'discarded').length,
    // Count by category
    news: tabs.filter(t => t.category === 'news' && t.status === 'unprocessed').length,
    shopping: tabs.filter(t => t.category === 'shopping' && t.status === 'unprocessed').length,
    reference: tabs.filter(t => t.category === 'reference' && t.status === 'unprocessed').length,
    social: tabs.filter(t => t.category === 'social' && t.status === 'unprocessed').length,
    entertainment: tabs.filter(t => t.category === 'entertainment' && t.status === 'unprocessed').length,
    uncategorized: tabs.filter(t => t.category === 'uncategorized' && t.status === 'unprocessed').length,
  }

  // Check if there are any tabs
  const hasTabs = tabs.length > 0

  if (!hasTabs) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No tabs to display
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              You haven't imported any tabs yet. Start by importing your Safari tabs.
            </p>
            <Link href="/import" className="btn-primary">
              Import Tabs
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-4">
        {/* Filter Panel - Now at top for both mobile and desktop */}
        <FilterPanel
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          tabCounts={tabCounts}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        
        {/* Tab Gallery - Full width */}
        <div className="w-full">
          <TabGallery
            showingDiscarded={showingDiscarded}
            filterStatus={activeFilter === 'all' ? 'unprocessed' : 
                       activeFilter === 'kept' ? 'kept' : 
                       activeFilter === 'discarded' ? 'discarded' : 'all'}
            searchTerm={searchTerm}
          />
        </div>
        
        {/* Mobile actions - Fixed at bottom on small screens */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 shadow-lg flex justify-around border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex flex-col items-center px-4 py-1 ${activeFilter === 'all' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className="text-xs mt-1">All</span>
          </button>
          
          <button
            onClick={() => setActiveFilter('kept')}
            className={`flex flex-col items-center px-4 py-1 ${activeFilter === 'kept' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs mt-1">Kept</span>
          </button>
          
          <button
            onClick={() => setActiveFilter('discarded')}
            className={`flex flex-col items-center px-4 py-1 ${activeFilter === 'discarded' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-xs mt-1">Trash</span>
          </button>
        </div>
      </div>
    </main>
  )
}