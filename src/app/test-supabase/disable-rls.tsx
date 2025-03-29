'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function DisableRLS() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleDisableRLS = async () => {
    try {
      setLoading(true)

      // Disable RLS for each table
      const tables = ['tabs', 'folders', 'profiles', 'tags', 'tab_tags', 'suggested_folders']
      const results = []

      for (const table of tables) {
        try {
          const { data, error } = await supabase.rpc('disable_rls', { table_name: table })

          if (error) {
            console.error(`Error disabling RLS for ${table}:`, error)
            results.push({ table, success: false, error: error.message })
          } else {
            console.log(`RLS disabled for ${table}:`, data)
            results.push({ table, success: true })
          }
        } catch (tableError) {
          console.error(`Error disabling RLS for ${table}:`, tableError)
          results.push({ table, success: false, error: String(tableError) })
        }
      }

      setResult({
        success: results.some(r => r.success),
        results
      })
    } catch (error) {
      console.error('Error disabling RLS:', error)
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
      <h2 className="text-lg font-semibold mb-4">Disable Row Level Security</h2>
      <p className="text-sm text-gray-600 mb-4">
        This will attempt to disable RLS for all tables. Note that this requires admin privileges.
      </p>

      <button
        onClick={handleDisableRLS}
        disabled={loading}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
      >
        {loading ? 'Disabling...' : 'Disable RLS for Testing'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">{result.success ? 'Success!' : 'Error'}</h3>

          {result.results ? (
            <div className="mt-2 space-y-2">
              {result.results.map((r: any, i: number) => (
                <div key={i} className={`p-2 rounded ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p>{r.table}: {r.success ? 'RLS Disabled' : `Failed: ${r.error}`}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}