'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function CreateBucketDirect() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCreateBucket = async () => {
    try {
      setLoading(true)

      // Run SQL to create the bucket directly
      const { data, error } = await supabase.rpc('create_storage_bucket', {
        bucket_name: 'tab-screenshots',
        is_public: true
      })

      if (error) {
        console.error('Error creating bucket with RPC:', error)

        // Try direct SQL as a fallback
        try {
          const { data: sqlData, error: sqlError } = await supabase.rpc('run_sql', {
            sql: `
              INSERT INTO storage.buckets (id, name, public)
              VALUES ('tab-screenshots', 'Tab Screenshots', true)
              ON CONFLICT (id) DO NOTHING;

              ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

              SELECT 'Bucket created or already exists' as result;
            `
          })

          if (sqlError) {
            console.error('Error with SQL fallback:', sqlError)
            throw sqlError
          }

          setResult({
            success: true,
            method: 'SQL',
            data: sqlData
          })
        } catch (sqlFallbackError) {
          console.error('SQL fallback failed:', sqlFallbackError)
          throw error // Throw the original error
        }
      } else {
        setResult({
          success: true,
          method: 'RPC',
          data
        })
      }
    } catch (error) {
      console.error('Error in create bucket direct:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Create Bucket (Direct SQL)</h2>

      <button
        onClick={handleCreateBucket}
        disabled={loading}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
      >
        {loading ? 'Creating...' : 'Create Bucket with SQL'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">{result.success ? 'Success!' : 'Error'}</h3>

          {result.success ? (
            <div>
              <p>Method: {result.method}</p>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result.data, null, 2)}
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