'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export default function StatusCheck() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true)

        // Check if the bucket exists
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('tab-screenshots')

        // Check if the functions exist
        const { data: functionData, error: functionError } = await supabase.rpc('run_sql', {
          sql: `
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_type = 'FUNCTION'
            AND routine_name IN ('run_sql', 'create_storage_bucket', 'disable_rls', 'enable_rls')
          `
        })

        // Check RLS status
        const { data: rlsData, error: rlsError } = await supabase.rpc('run_sql', {
          sql: `
            SELECT tablename, rowsecurity
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename IN ('tabs', 'folders', 'profiles', 'tags', 'tab_tags', 'suggested_folders')
          `
        })

        setStatus({
          bucket: {
            exists: !bucketError,
            data: bucketData,
            error: bucketError
          },
          functions: {
            exists: !functionError,
            data: functionData,
            error: functionError
          },
          rls: {
            exists: !rlsError,
            data: rlsData,
            error: rlsError
          }
        })
      } catch (error) {
        console.error('Error checking status:', error)
        setStatus({
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [])

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">System Status</h2>

      {loading ? (
        <p>Checking status...</p>
      ) : status?.error ? (
        <div className="p-4 bg-red-100 rounded">
          <p className="text-red-700">{status.error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Storage Bucket</h3>
            <p className={status.bucket.exists ? 'text-green-600' : 'text-red-600'}>
              {status.bucket.exists ? 'Bucket exists' : 'Bucket does not exist'}
            </p>
            {status.bucket.error && (
              <p className="text-sm text-red-500 mt-1">{status.bucket.error.message}</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Helper Functions</h3>
            <p className={status.functions.exists ? 'text-green-600' : 'text-red-600'}>
              {status.functions.exists ? 'Functions exist' : 'Functions do not exist'}
            </p>
            {status.functions.data && (
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                {JSON.stringify(status.functions.data, null, 2)}
              </pre>
            )}
            {status.functions.error && (
              <p className="text-sm text-red-500 mt-1">{status.functions.error.message}</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Row Level Security</h3>
            <p className={status.rls.exists ? 'text-green-600' : 'text-red-600'}>
              {status.rls.exists ? 'RLS status available' : 'RLS status not available'}
            </p>
            {status.rls.data && (
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                {JSON.stringify(status.rls.data, null, 2)}
              </pre>
            )}
            {status.rls.error && (
              <p className="text-sm text-red-500 mt-1">{status.rls.error.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}