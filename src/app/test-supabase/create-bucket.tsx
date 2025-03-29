'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function CreateBucketTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCreateBucket = async () => {
    try {
      setLoading(true)

      // Try to get the bucket first to see if it exists
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('tab-screenshots')

      if (bucketError) {
        console.log('Bucket does not exist, creating it...')

        // Create the bucket
        const { data, error } = await supabase.storage.createBucket('tab-screenshots', {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
        })

        if (error) {
          console.error('Error creating bucket:', error)
          throw error
        }
      } else {
        console.log('Bucket already exists:', bucketData)
      }

      console.log('Bucket ready for use')

      // Test the bucket by uploading a small test file
      const testBlob = new Blob(['test file content'], { type: 'text/plain' })
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tab-screenshots')
        .upload('test-file.txt', testBlob)

      if (uploadError) {
        console.error('Error uploading test file:', uploadError)
        setResult({
          success: true,
          bucketCreated: true,
          testUpload: false,
          error: uploadError.message
        })
        return
      }

      console.log('Test file uploaded successfully:', uploadData)

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tab-screenshots')
        .getPublicUrl('test-file.txt')

      setResult({
        success: true,
        bucketCreated: true,
        testUpload: true,
        publicUrl
      })
    } catch (error) {
      console.error('Error in create bucket test:', error)
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
      <h2 className="text-lg font-semibold mb-4">Create Storage Bucket</h2>

      <button
        onClick={handleCreateBucket}
        disabled={loading}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Creating...' : 'Create tab-screenshots Bucket'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">{result.success ? 'Success!' : 'Error'}</h3>

          {result.success ? (
            <div className="space-y-2">
              <p>Bucket created: {result.bucketCreated ? '✅' : '❌'}</p>
              <p>Test upload: {result.testUpload ? '✅' : '❌'}</p>
              {result.testUpload && (
                <div>
                  <p>Public URL:</p>
                  <a
                    href={result.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline break-all"
                  >
                    {result.publicUrl}
                  </a>
                </div>
              )}
              {!result.testUpload && result.error && (
                <p className="text-red-500">{result.error}</p>
              )}
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}