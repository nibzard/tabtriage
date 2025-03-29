'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTabsContext } from '@/context/TabsContext'
import { processTabsWithAI } from '@/services/tabService'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { logger } from '@/utils/logger'

interface ProcessingStatusProps {
  progress: number
  totalTabs: number
  onComplete: () => void
}

export function ProcessingStatus({ progress, totalTabs, onComplete }: ProcessingStatusProps) {
  const [isComplete, setIsComplete] = useState(false)
  const [processingStep, setProcessingStep] = useState<'importing' | 'analyzing' | 'organizing'>('importing')
  const { tabs, updateTab } = useTabsContext()
  const router = useRouter()

  const progressPercentage = Math.min(Math.round((progress / totalTabs) * 100), 100)

  useEffect(() => {
    const processImportedTabs = async () => {
      // Identify the most recently added tabs (unprocessed ones)
      const unprocessedTabs = tabs.filter(tab => !tab.summary || tab.summary === '')

      if (unprocessedTabs.length === 0) {
        setProcessingStep('organizing')
        setIsComplete(true)
        return
      }

      try {
        // First update UI to show we're moving to next step
        setProcessingStep('analyzing')

        // Process each tab with AI
        for (const tab of unprocessedTabs) {
          try {
            // Process as an array of one tab
            const processedTabs = await processTabsWithAI([tab])
            if (processedTabs && processedTabs.length > 0) {
              // Use the first (and only) processed tab
              updateTab(tab.id, processedTabs[0])
            }
          } catch (error) {
            logger.error(`Error processing tab ${tab.id}:`, error)
            // Continue with other tabs even if one fails
          }
        }

        setProcessingStep('organizing')
        setIsComplete(true)
      } catch (error) {
        logger.error('Error in batch processing tabs:', error)
        toast.error('Error processing tabs. Some tabs may not be fully processed.')
        setIsComplete(true)
      }
    }

    // Start processing when we reach 100%
    if (progressPercentage === 100 && !isComplete) {
      processImportedTabs()
    }
  }, [progressPercentage, isComplete, tabs, updateTab])

  const stepMessages = {
    importing: 'Importing your tabs...',
    analyzing: 'Analyzing content and generating descriptions...',
    organizing: 'Organizing tabs into categories...'
  }

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200 dark:text-primary-200 dark:bg-primary-900/30">
                  {processingStep.charAt(0).toUpperCase() + processingStep.slice(1)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-primary-600 dark:text-primary-300">
                  {progressPercentage}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200 dark:bg-gray-700">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
              ></motion.div>
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            {stepMessages[processingStep]}
          </p>
          {processingStep === 'analyzing' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This may take a minute or two...
            </p>
          )}
        </div>

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-green-800 dark:text-green-300 font-medium text-lg">
                Import Complete!
              </h3>
              <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                {totalTabs} tabs have been successfully imported.
              </p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  onComplete()
                  router.push('/gallery')
                }}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium transition"
              >
                View Tabs
              </button>
              <button
                onClick={onComplete}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md font-medium transition"
              >
                Import More
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}