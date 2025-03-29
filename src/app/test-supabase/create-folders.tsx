'use client'

import { useState } from 'react'
import { saveFolderToDatabase } from '@/utils/supabase'
import { folders as defaultFolders } from '@/data/mockData'
import { generateUUID } from '@/utils/uuid'

export default function CreateFoldersTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCreateFolders = async () => {
    try {
      setLoading(true)

      // Get the user ID from localStorage
      const userId = localStorage.getItem('tabtriage_user_id')

      if (!userId) {
        throw new Error('No user ID found. Please create a test profile first.')
      }

      console.log('Creating folders for user ID:', userId);
      console.log('Default folders:', JSON.stringify(defaultFolders, null, 2));

      // Create default folders
      const results = await Promise.all(
        defaultFolders.map(async (folder) => {
          try {
            console.log('Saving folder:', JSON.stringify(folder, null, 2));
            const folderId = await saveFolderToDatabase(folder, userId);
            console.log('Folder saved with ID:', folderId);
            return {
              success: !!folderId,
              folderId,
              folder
            }
          } catch (error) {
            console.error('Error saving folder:', folder.name, error);
            return {
              success: false,
              folder,
              error: error instanceof Error ? error.message : String(error)
            }
          }
        })
      )

      setResult({
        success: results.some(r => r.success),
        totalFolders: defaultFolders.length,
        successCount: results.filter(r => r.success).length,
        results
      })
    } catch (error) {
      console.error('Error creating folders:', error)
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
      <h2 className="text-lg font-semibold mb-4">Create Default Folders</h2>

      <button
        onClick={handleCreateFolders}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Creating...' : 'Create Default Folders'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">{result.success ? 'Success!' : 'Error'}</h3>

          {result.success ? (
            <div>
              <p>Created {result.successCount} of {result.totalFolders} folders</p>
              <div className="mt-2 space-y-2">
                {result.results.map((r: any, i: number) => (
                  <div key={i} className={`p-2 rounded ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p>{r.folder.name}: {r.success ? `Created (ID: ${r.folderId})` : `Failed: ${r.error}`}</p>
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