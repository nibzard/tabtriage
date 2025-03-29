'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function DirectTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleDirectTest = async () => {
    try {
      setLoading(true)

      // Get the user ID from localStorage
      const userId = localStorage.getItem('tabtriage_user_id')

      if (!userId) {
        throw new Error('No user ID found. Please create a test profile first.')
      }

      console.log('Using user ID:', userId)

      // Create a test tab with a hardcoded UUID
      const tabId = '12345678-1234-4321-abcd-1234567890ab'

      // Insert directly using Supabase client
      const { data, error } = await supabase
        .from('tabs')
        .insert({
          id: tabId,
          user_id: userId,
          title: 'Direct Test Tab',
          url: 'https://example.com/direct-test',
          domain: 'example.com',
          date_added: new Date().toISOString().split('T')[0],
          summary: 'This is a direct test tab.',
          category: 'test',
          status: 'unprocessed'
        })
        .select()

      if (error) {
        console.error('Error inserting tab:', error)
        throw error
      }

      console.log('Tab inserted successfully:', data)

      setResult({
        success: true,
        data
      })
    } catch (error) {
      console.error('Error in direct test:', error)
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
      <h2 className="text-lg font-semibold mb-4">Direct Supabase Test</h2>

      <button
        onClick={handleDirectTest}
        disabled={loading}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Run Direct Supabase Test'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">{result.success ? 'Success!' : 'Error'}</h3>

          {result.success ? (
            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}