'use client'

import { useState } from 'react'
import { parseTabsFromText, processTabsWithAI } from '@/services/tabService'
import { saveTabToDatabase } from '@/utils/supabase'

export default function TestImport() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTestImport = async () => {
    try {
      setLoading(true)

      // Get the user ID from localStorage
      const userId = localStorage.getItem('tabtriage_user_id')

      if (!userId) {
        throw new Error('No user ID found. Please create a test profile first.')
      }

      console.log('Using user ID:', userId)

      // Create some test URLs
      const testUrls = `
        https://example.com/page1
        https://example.com/page2
        https://example.com/page3
      `

      // Parse tabs from text
      const tabs = parseTabsFromText(testUrls)
      console.log('Parsed tabs:', tabs)

      // Process tabs with AI (this is a simplified version)
      const processedTabs = await Promise.all(
        tabs.map(async (tab) => {
          // Add some dummy data
          return {
            ...tab,
            title: `Test: ${tab.url}`,
            summary: 'This is a test summary generated for testing imports.',
            category: 'test',
            tags: ['test', 'import'],
          }
        })
      )

      console.log('Processed tabs:', processedTabs)

      // Save tabs to database
      const savedTabIds = await Promise.all(
        processedTabs.map(async (tab) => {
          try {
            const tabId = await saveTabToDatabase(tab, userId)
            return { tabId, success: !!tabId, url: tab.url }
          } catch (error) {
            console.error(`Error saving tab ${tab.url}:`, error)
            return { tabId: null, success: false, url: tab.url, error: String(error) }
          }
        })
      )

      console.log('Saved tab IDs:', savedTabIds)

      setResult({
        success: savedTabIds.some(r => r.success),
        totalTabs: tabs.length,
        successCount: savedTabIds.filter(r => r.success).length,
        results: savedTabIds
      })
    } catch (error) {
      console.error('Error in test import:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Test Import Functionality</h2>

      <button
        onClick={handleTestImport}
        disabled={loading}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
      >
        {loading ? 'Importing...' : 'Test Import Process'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">{result.success ? 'Success!' : 'Error'}</h3>

          {result.success ? (
            <div>
              <p>Imported {result.successCount} of {result.totalTabs} tabs</p>
              <div className="mt-2 space-y-2">
                {result.results.map((r: any, i: number) => (
                  <div key={i} className={`p-2 rounded ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p>{r.url}: {r.success ? `Saved (ID: ${r.tabId})` : `Failed: ${r.error}`}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}