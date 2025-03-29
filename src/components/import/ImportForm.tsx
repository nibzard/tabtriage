'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { parseTabsFromText, parseTabsFromFile } from '@/services/tabService'
import { useTabsContext } from '@/context/TabsContext'

interface ImportFormProps {
  onImportStart: (tabCount: number) => void
  onUpdateProgress?: (progress: number) => void
}

export function ImportForm({ onImportStart, onUpdateProgress }: ImportFormProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [pastedUrls, setPastedUrls] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addTabs } = useTabsContext()

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'text/plain' || droppedFile.name.endsWith('.txt') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
      } else {
        toast.error('Only text or CSV files are supported')
      }
    } else if (e.dataTransfer.getData('text')) {
      setPastedUrls(e.dataTransfer.getData('text'))
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setPastedUrls('') // Clear pasted URLs if file is selected
    }
  }

  // Process and import tabs
  const importTabs = async () => {
    try {
      setIsLoading(true)
      let newTabs = []

      if (pastedUrls.trim()) {
        newTabs = await parseTabsFromText(pastedUrls)
      } else if (file) {
        newTabs = await parseTabsFromFile(file)
      } else {
        toast.error('Please paste some URLs or select a file')
        setIsLoading(false)
        return
      }

      if (newTabs.length === 0) {
        toast.error('No valid URLs found to import')
        setIsLoading(false)
        return
      }

      // Signal that import has started
      onImportStart(newTabs.length)
      
      // Process tabs in batches to show progress
      const BATCH_SIZE = 5
      for (let i = 0; i < newTabs.length; i += BATCH_SIZE) {
        const batch = newTabs.slice(i, i + BATCH_SIZE)
        addTabs(batch)
        
        // Update progress
        if (onUpdateProgress) {
          onUpdateProgress(Math.min(i + BATCH_SIZE, newTabs.length))
        }
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Reset form
      setPastedUrls('')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      toast.success(`${newTabs.length} tabs imported successfully`)
    } catch (error) {
      console.error('Error importing tabs:', error)
      toast.error('Error importing tabs. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Simplified Import Area - Unified Import */}
      <div 
        className={`border-2 border-dashed rounded-lg p-6 mb-4 ${
          isDragging
            ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/10'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center p-3 bg-primary-100 text-primary-600 rounded-full dark:bg-primary-900 dark:text-primary-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </span>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Import Your Tabs
          </h2>
          
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-300">
              Paste your Safari tab links below, or drag & drop a file
            </p>
            
            <textarea
              rows={6}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Paste URLs here, one per line"
              value={pastedUrls}
              onChange={(e) => setPastedUrls(e.target.value)}
              disabled={isLoading || !!file}
            ></textarea>
            
            <div className="text-center py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
            </div>
            
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
              >
                Select File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.csv"
                className="hidden"
              />
            </div>
          </div>
          
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                  {file.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Import Button */}
      <div className="space-y-4">
        <button
          onClick={importTabs}
          disabled={isLoading || (!pastedUrls.trim() && !file)}
          className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-md font-medium transition text-lg"
        >
          {isLoading ? 'Processing...' : 'Import Tabs'}
        </button>
        
        {/* Help Button that toggles instruction visibility */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {showHelp ? 'Hide Instructions' : 'Need Help?'}
        </button>
      </div>
      
      {/* Collapsible Help Section */}
      {showHelp && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
        >
          <h3 className="text-md font-medium mb-3 text-gray-900 dark:text-white">How to Export Safari Tabs</h3>
          
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <h4 className="font-medium">On iOS (iPhone/iPad):</h4>
              <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                <li>Open Safari</li>
                <li>Tap the tabs icon in the bottom right</li>
                <li>Long press on "X Tabs" at the bottom</li>
                <li>Select "Copy X Links"</li>
                <li>Paste above</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium">On macOS:</h4>
              <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                <li>Open Safari</li>
                <li>View &gt; Show Tab Overview</li>
                <li>Select tabs (Cmd+click for multiple)</li>
                <li>Right-click and choose "Copy Links"</li>
                <li>Paste above</li>
              </ol>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}