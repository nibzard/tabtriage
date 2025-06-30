'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { logger } from '@/utils/logger'
import { Header } from '@/components/Header'
import { HeaderMobile } from '@/components/HeaderMobile'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { useResponsive } from '@/hooks/useUI'

export default function SettingsPage() {
  const { user } = useAuth()
  const { isMobile } = useResponsive()
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'txt' | 'csv' | 'json'>('txt')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [tabs, setTabs] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerationProgress, setRegenerationProgress] = useState<{
    total: number;
    processed: number;
    current?: string;
  } | null>(null)

  // Fetch data from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch tabs
        const tabsResponse = await fetch('/api/tabs')
        if (tabsResponse.ok) {
          const tabsData = await tabsResponse.json()
          setTabs(tabsData)
        } else {
          console.error('Failed to fetch tabs:', tabsResponse.statusText)
          setTabs([])
        }
        
        // Fetch folders
        const foldersResponse = await fetch('/api/folders')
        if (foldersResponse.ok) {
          const foldersData = await foldersResponse.json()
          setFolders(foldersData)
        } else {
          console.error('Failed to fetch folders:', foldersResponse.statusText)
          setFolders([])
        }
      } catch (error) {
        logger.error('Error fetching data:', error)
        setTabs([])
        setFolders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const exportData = async () => {
    try {
      setIsExporting(true)
      
      if (tabs.length === 0) {
        alert('No tabs to export')
        return
      }

      let content = ''
      let filename = ''
      let mimeType = ''

      switch (exportFormat) {
        case 'txt':
          content = tabs.map(tab => tab.url).join('\n')
          filename = `tabtriage-export-${new Date().toISOString().split('T')[0]}.txt`
          mimeType = 'text/plain'
          break
        
        case 'csv':
          const csvHeaders = 'Title,URL,Domain,Date Added,Category,Tags,Status\n'
          const csvRows = tabs.map(tab => 
            `"${tab.title || ''}","${tab.url}","${tab.domain || ''}","${tab.dateAdded}","${tab.category || ''}","${(tab.tags || []).join('; ')}","${tab.status || ''}"`
          ).join('\n')
          content = csvHeaders + csvRows
          filename = `tabtriage-export-${new Date().toISOString().split('T')[0]}.csv`
          mimeType = 'text/csv'
          break
        
        case 'json':
          const exportDataJson = {
            exportDate: new Date().toISOString(),
            tabsCount: tabs.length,
            tabs: tabs,
            folders: folders
          }
          content = JSON.stringify(exportDataJson, null, 2)
          filename = `tabtriage-export-${new Date().toISOString().split('T')[0]}.json`
          mimeType = 'application/json'
          break
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      logger.info(`Exported ${tabs.length} tabs as ${exportFormat}`)
    } catch (error) {
      logger.error('Error exporting data:', error)
      alert('Error exporting data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const clearAllData = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type "DELETE" to confirm')
      return
    }

    try {
      setIsDeleting(true)
      
      // Call the API to clear all user data from the database
      const response = await fetch('/api/tabs/clear-all', {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to clear data')
      }
      
      const result = await response.json()
      
      logger.info('All TabTriage data cleared from database:', result.deleted)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
      
      // Update local state to reflect the cleared data
      setTabs([])
      setFolders([])
      
      alert(`All data has been cleared successfully. Deleted: ${result.deleted.tabs} tabs, ${result.deleted.folders} folders`)
      
    } catch (error) {
      logger.error('Error clearing data:', error)
      alert(`Error clearing data: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
  }

  const regenerateAllTabs = async () => {
    if (tabs.length === 0) {
      alert('No tabs to regenerate')
      return
    }

    const confirmed = window.confirm(
      `This will regenerate screenshots, content, and embeddings for all ${tabs.length} tabs. This may take several minutes. Continue?`
    )

    if (!confirmed) return

    let progressInterval: NodeJS.Timeout | null = null
    
    try {
      setIsRegenerating(true)
      setRegenerationProgress({ total: tabs.length, processed: 0 })

      logger.info(`Starting regeneration of ${tabs.length} tabs`)

      // Start progress simulation while waiting for API response
      progressInterval = setInterval(() => {
        setRegenerationProgress(prev => {
          if (!prev) return null
          // Simulate progress based on estimated time (3 seconds per tab)
          const estimatedProgress = Math.min(
            prev.processed + 1,
            Math.floor(prev.total * 0.9) // Cap at 90% until actual completion
          )
          return { ...prev, processed: estimatedProgress }
        })
      }, 3000) // Update every 3 seconds (approximate time per tab)

      const response = await fetch('/api/tabs/regenerate-all', {
        method: 'POST',
      })

      if (progressInterval) {
        clearInterval(progressInterval) // Stop simulation
        progressInterval = null
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to regenerate tabs')
      }

      const result = await response.json()
      
      logger.info('Bulk regeneration completed:', result.stats)
      
      // Set to 100% completion
      setRegenerationProgress({ total: tabs.length, processed: tabs.length })
      
      // Brief delay to show completion
      setTimeout(() => {
        setRegenerationProgress(null)
      }, 1000)
      
      // Show results to user
      const message = `Regeneration completed!\n\n` +
        `✅ Successful: ${result.stats.successful}\n` +
        `❌ Failed: ${result.stats.failed}\n` +
        `📊 Total processed: ${result.stats.processed}\n\n` +
        (result.stats.errors.length > 0 ? 
          `Errors encountered:\n${result.stats.errors.slice(0, 3).join('\n')}${result.stats.errors.length > 3 ? '\n...' : ''}` 
          : 'All tabs processed successfully!')

      alert(message)

      // Refresh the tabs data to show updated content
      const tabsResponse = await fetch('/api/tabs')
      if (tabsResponse.ok) {
        const tabsData = await tabsResponse.json()
        setTabs(tabsData)
      }

    } catch (error) {
      logger.error('Error regenerating tabs:', error)
      alert(`Error regenerating tabs: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      // Clean up interval if it's still running
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setIsRegenerating(false)
      setRegenerationProgress(null)
    }
  }

  const tabsCount = tabs.length
  const foldersCount = folders.length

  // Show loading state
  if (isLoading) {
    return (
      <>
        <main className="min-h-screen bg-background pb-safe-area-inset-bottom overflow-x-hidden">
          {isMobile ? <HeaderMobile /> : <Header />}
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading settings...</p>
              </div>
            </div>
          </div>
        </main>
        {isMobile && <MobileNavigation />}
      </>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-background pb-safe-area-inset-bottom overflow-x-hidden">
        {isMobile ? <HeaderMobile /> : <Header />}
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your TabTriage preferences and data
              </p>
            </div>

        <div className="p-6 space-y-8">
          {/* Account Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.isAnonymous ? 'Guest User' : (user?.email || 'Not signed in')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.isAnonymous 
                      ? 'Sign in to sync your data across devices' 
                      : 'Your data is being saved to your account'
                    }
                  </p>
                </div>
                {user?.isAnonymous && (
                  <a
                    href="/auth/sign-in"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                  >
                    Sign In
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Data Overview Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary">{tabsCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Saved Tabs</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-2xl font-bold text-primary">{foldersCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Folders</p>
              </div>
            </div>
          </section>

          {/* Content Regeneration Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Management</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Regenerate All Content
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Regenerate screenshots, extract fresh page content, and update embeddings for all tabs. 
                This improves search quality and ensures content is up-to-date.
              </p>
              
              {isRegenerating && regenerationProgress && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Regenerating content...
                    </span>
                    <span className="text-sm text-blue-600 dark:text-blue-300">
                      {regenerationProgress.processed} / {regenerationProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(regenerationProgress.processed / regenerationProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  {regenerationProgress.current && (
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1 truncate">
                      Processing: {regenerationProgress.current}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {tabsCount} tabs will be processed
                </div>
                <button
                  onClick={regenerateAllTabs}
                  disabled={isRegenerating || tabsCount === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRegenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate All
                    </>
                  )}
                </button>
              </div>

              {tabsCount === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  No tabs to regenerate. Import some tabs first.
                </p>
              )}
            </div>
          </section>

          {/* Export Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Data</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export your tabs and folders for backup or migration
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <label htmlFor="export-format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Export Format
                  </label>
                  <select
                    id="export-format"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'txt' | 'csv' | 'json')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="txt">Plain Text (URLs only)</option>
                    <option value="csv">CSV (Spreadsheet compatible)</option>
                    <option value="json">JSON (Complete data)</option>
                  </select>
                </div>
                
                <button
                  onClick={exportData}
                  disabled={isExporting || tabsCount === 0}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting...' : 'Export Data'}
                </button>
              </div>

              {tabsCount === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  No tabs to export. Import some tabs first.
                </p>
              )}
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h2>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-md font-medium text-red-800 dark:text-red-200 mb-2">
                Clear All Data
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                This will permanently delete all your tabs, folders, settings, and uploaded images (screenshots). 
                All files stored in cloud storage will also be removed. This action cannot be undone.
              </p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Clear All Data
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="delete-confirm" className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Type &quot;DELETE&quot; to confirm:
                    </label>
                    <input
                      id="delete-confirm"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Type DELETE here"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={clearAllData}
                      disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      onClick={handleDeleteCancel}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
      </main>
      {isMobile && <MobileNavigation />}
    </>
  )
}