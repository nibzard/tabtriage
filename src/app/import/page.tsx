'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { ImportForm } from '@/components/import/ImportForm'
import { ProcessingStatus } from '@/components/import/ProcessingStatus'
import { useTabsContext } from '@/context/TabsContext'

export default function ImportPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalTabs, setTotalTabs] = useState(0)
  const { tabs } = useTabsContext()

  // Check if there are already tabs in the system
  const hasExistingTabs = tabs.length > 0

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
            Import Your Safari Tabs
          </h1>

          {hasExistingTabs && !isProcessing && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    You already have {tabs.length} tabs imported. Importing more tabs will add to your existing collection.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {!isProcessing ? (
              <ImportForm
                onImportStart={(tabCount) => {
                  setIsProcessing(true)
                  setTotalTabs(tabCount)
                }}
                onUpdateProgress={(current) => {
                  setProgress(current)
                }}
              />
            ) : (
              <ProcessingStatus
                progress={progress}
                totalTabs={totalTabs}
                onComplete={() => {
                  setIsProcessing(false)
                  setProgress(0)
                }}
              />
            )}
          </div>

          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">How to Export Safari Tabs</h2>

            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <div>
                <h3 className="font-medium">On iOS (iPhone/iPad):</h3>
                <ol className="list-decimal list-inside ml-4 mt-2 space-y-2">
                  <li>Open Safari</li>
                  <li>Tap the tabs icon in the bottom right corner (looks like two squares)</li>
                  <li>Long press on "X Tabs" at the bottom of the screen</li>
                  <li>Select "Copy X Links" from the menu (where X is the number of tabs)</li>
                  <li>Paste the copied links in the text area above</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium">On macOS:</h3>
                <ol className="list-decimal list-inside ml-4 mt-2 space-y-2">
                  <li>Open Safari</li>
                  <li>Click on View &gt; Show Tab Overview</li>
                  <li>Select the tabs you want to export (Cmd+click for multiple)</li>
                  <li>Right-click and choose "Copy Links"</li>
                  <li>Paste the copied links in the text area above</li>
                </ol>
              </div>

              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <h3 className="font-medium text-blue-700 dark:text-blue-300">Alternative Method:</h3>
                <p className="mt-1 text-blue-600 dark:text-blue-400">
                  You can also save your links to a text file (.txt) and upload it using the "Upload File" tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}