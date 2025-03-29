'use client'

import { useState } from 'react'
import { saveTabToDatabase } from '@/utils/supabase'
import { generateUUID } from '@/utils/uuid'

export default function SaveTabTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSaveTab = async () => {
    try {
      setLoading(true)

      // Get the user ID from localStorage
      const userId = localStorage.getItem('tabtriage_user_id')

      if (!userId) {
        throw new Error('No user ID found. Please create a test profile first.')
      }

      // Create a test tab with UUID
      const testTab = {
        id: generateUUID(), // Generate a proper UUID
        title: `Test Tab ${new Date().toLocaleTimeString()}`,
        url: 'https://example.com/test',
        domain: 'example.com',
        dateAdded: new Date().toISOString().split('T')[0], // Just the date part
        summary: 'This is a test tab created for testing Supabase integration.',
        category: 'test',
        tags: ['test', 'example'],
        status: 'unprocessed' as 'unprocessed', // Type assertion for TypeScript
        suggestedFolders: []
      }

      console.log('Saving tab to database with user ID:', userId);
      console.log('Tab data:', JSON.stringify(testTab, null, 2));

      // Save the tab to Supabase
      try {
        const tabId = await saveTabToDatabase(testTab, userId);
        console.log('Tab saved with ID:', tabId);

        setResult({
          success: !!tabId,
          tabId,
          tab: testTab
        });
      } catch (saveError) {
        console.error('Error in saveTabToDatabase:', saveError);
        throw saveError;
      }
    } catch (error) {
      console.error('Error saving test tab:', error)
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
      <h2 className="text-lg font-semibold mb-4">Test Save Tab</h2>

      <button
        onClick={handleSaveTab}
        disabled={loading}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Saving...' : 'Save Test Tab to Supabase'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">{result.success ? 'Success!' : 'Error'}</h3>

          {result.success ? (
            <div>
              <p>Tab saved with ID: <code className="bg-gray-200 px-2 py-1 rounded">{result.tabId}</code></p>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result.tab, null, 2)}
              </pre>
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}