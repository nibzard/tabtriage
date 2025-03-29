'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import SaveTabTest from './save-tab'
import CreateFoldersTest from './create-folders'
import DirectTest from './direct-test'
import DirectFolderTest from './direct-folder-test'
import CreateBucketTest from './create-bucket'
import CreateBucketDirect from './create-bucket-direct'
import DisableRLS from './disable-rls'
import TestImport from './test-import'
import StatusCheck from './status'

export default function TestSupabasePage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const storedUserId = localStorage.getItem('tabtriage_user_id')
    setUserId(storedUserId)

    const testConnection = async () => {
      try {
        setLoading(true)

        // Test profiles table
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .limit(10)

        // Test folders table
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .limit(10)

        // Test tabs table
        const { data: tabsData, error: tabsError } = await supabase
          .from('tabs')
          .select('*')
          .limit(10)

        // Test storage
        const { data: bucketData, error: bucketError } = await supabase
          .storage
          .getBucket('tab-screenshots')

        setTestResults({
          profiles: {
            success: !profilesError,
            count: profilesData?.length || 0,
            data: profilesData,
            error: profilesError
          },
          folders: {
            success: !foldersError,
            count: foldersData?.length || 0,
            data: foldersData,
            error: foldersError
          },
          tabs: {
            success: !tabsError,
            count: tabsData?.length || 0,
            data: tabsData,
            error: tabsError
          },
          storage: {
            success: !bucketError,
            bucket: bucketData,
            error: bucketError
          }
        })
      } catch (err) {
        console.error('Error testing Supabase connection:', err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  const createTestProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({ email: `test-${Date.now()}@example.com`, display_name: 'Test User' })
        .select()

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        const newProfileId = data[0].id
        localStorage.setItem('tabtriage_user_id', newProfileId)
        setUserId(newProfileId)
        alert(`Created new profile with ID: ${newProfileId}`)
        window.location.reload()
      }
    } catch (err) {
      console.error('Error creating test profile:', err)
      alert(`Error creating test profile: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>

      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">User ID</h2>
        <p className="mb-2">Current User ID: <code className="bg-gray-200 px-2 py-1 rounded">{userId || 'None'}</code></p>
        <button
          onClick={createTestProfile}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Test Profile
        </button>
      </div>

      {loading ? (
        <div className="text-center">
          <p>Testing Supabase connection...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(testResults).map(([key, value]: [string, any]) => (
              <div key={key} className={`p-4 rounded-lg ${value.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <h3 className="font-semibold mb-2 capitalize">{key}</h3>
                <p>Status: {value.success ? 'Success' : 'Error'}</p>
                {value.count !== undefined && <p>Count: {value.count}</p>}

                {value.error && (
                  <div className="mt-2">
                    <p className="font-semibold text-red-700">Error:</p>
                    <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(value.error, null, 2)}
                    </pre>
                  </div>
                )}

                {value.data && (
                  <div className="mt-2">
                    <p className="font-semibold">Data:</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(value.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 mt-8">
        <StatusCheck />
        <DisableRLS />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Standard Tests</h3>
            <CreateFoldersTest />
            <SaveTabTest />
            <TestImport />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Direct Supabase Tests</h3>
            <DirectTest />
            <DirectFolderTest />
            <CreateBucketTest />
            <CreateBucketDirect />
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Next Steps</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Make sure all the tests above are passing</li>
          <li>Go to the <a href="/import" className="text-blue-500 hover:underline">Import page</a> to import your real tabs</li>
          <li>Check your Supabase dashboard to see if the tabs appear in the database</li>
          <li>If you want to re-enable RLS later, make sure to set up proper policies</li>
        </ol>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-md font-semibold text-yellow-800 mb-2">Important Note</h3>
          <p className="text-sm text-yellow-700">
            For development and testing, we've disabled Row Level Security (RLS) on the tables.
            This makes it easier to test, but in a production environment, you should enable RLS
            with proper policies to secure your data.
          </p>
        </div>
      </div>
    </div>
  )
}