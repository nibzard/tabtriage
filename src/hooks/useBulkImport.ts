import { useState, useEffect, useCallback } from 'react'
import { BulkImportProgress } from '@/services/bulkImportService'
import { logger } from '@/utils/logger'

export interface UseBulkImportResult {
  // Queue a new bulk import
  queueImport: (tabs: any[], userId: string) => Promise<string | null>
  
  // Get status of specific job
  getJobStatus: (jobId: string) => Promise<BulkImportProgress | null>
  
  // Get all jobs for user
  getUserJobs: (userId: string) => Promise<BulkImportProgress[]>
  
  // Cancel a job
  cancelJob: (jobId: string) => Promise<boolean>
  
  // Current jobs being tracked
  trackedJobs: Map<string, BulkImportProgress>
  
  // Global queue status
  queueStatus: {
    queuedJobs: number
    processingJobs: number
    maxConcurrentJobs: number
    rateLimitStatus: Record<string, any>
  } | null
  
  // Loading states
  isLoading: boolean
  error: string | null
}

export function useBulkImport(
  autoRefresh = true,
  refreshInterval = 2000
): UseBulkImportResult {
  const [trackedJobs, setTrackedJobs] = useState<Map<string, BulkImportProgress>>(new Map())
  const [queueStatus, setQueueStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Queue a new bulk import
   */
  const queueImport = useCallback(async (tabs: any[], userId: string): Promise<string | null> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/tabs/bulk-import-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs, userId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to queue import')
      }

      const result = await response.json()
      
      if (result.queued && result.jobId) {
        // Start tracking this job
        const initialProgress: BulkImportProgress = {
          id: result.jobId,
          totalTabs: tabs.length,
          processedTabs: 0,
          failedTabs: 0,
          currentPhase: 'queued',
          startedAt: new Date().toISOString(),
          errors: []
        }
        
        setTrackedJobs(prev => new Map(prev).set(result.jobId, initialProgress))
        logger.info(`Started tracking bulk import job: ${result.jobId}`)
        
        return result.jobId
      }

      return null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('Error queuing bulk import:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get status of specific job
   */
  const getJobStatus = useCallback(async (jobId: string): Promise<BulkImportProgress | null> => {
    try {
      const response = await fetch(`/api/tabs/bulk-import-queue?jobId=${encodeURIComponent(jobId)}`)
      
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to get job status')
      }

      const result = await response.json()
      return result.job || null
    } catch (err) {
      logger.error(`Error getting job status for ${jobId}:`, err)
      return null
    }
  }, [])

  /**
   * Get all jobs for user
   */
  const getUserJobs = useCallback(async (userId: string): Promise<BulkImportProgress[]> => {
    try {
      const response = await fetch(`/api/tabs/bulk-import-queue?userId=${encodeURIComponent(userId)}`)
      
      if (!response.ok) {
        throw new Error('Failed to get user jobs')
      }

      const result = await response.json()
      return result.jobs || []
    } catch (err) {
      logger.error(`Error getting user jobs for ${userId}:`, err)
      return []
    }
  }, [])

  /**
   * Cancel a job
   */
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/tabs/bulk-import-queue?jobId=${encodeURIComponent(jobId)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel job')
      }

      // Update tracked job status
      setTrackedJobs(prev => {
        const updated = new Map(prev)
        const job = updated.get(jobId)
        if (job) {
          job.currentPhase = 'failed'
          job.completedAt = new Date().toISOString()
          job.errors.push('Cancelled by user')
          updated.set(jobId, job)
        }
        return updated
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error(`Error cancelling job ${jobId}:`, err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Refresh tracked jobs and queue status
   */
  const refreshStatus = useCallback(async () => {
    try {
      // Get global queue status
      const queueResponse = await fetch('/api/tabs/bulk-import-queue')
      if (queueResponse.ok) {
        const queueData = await queueResponse.json()
        setQueueStatus(queueData)
      }

      // Update tracked jobs
      if (trackedJobs.size > 0) {
        const updates = new Map(trackedJobs)
        
        for (const [jobId, currentProgress] of trackedJobs) {
          // Skip completed jobs
          if (currentProgress.currentPhase === 'completed' || currentProgress.currentPhase === 'failed') {
            continue
          }

          const updated = await getJobStatus(jobId)
          if (updated) {
            updates.set(jobId, updated)
          }
        }

        setTrackedJobs(updates)
      }
    } catch (err) {
      logger.error('Error refreshing status:', err)
    }
  }, [trackedJobs, getJobStatus])

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(refreshStatus, refreshInterval)
    
    // Initial load
    refreshStatus()

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshStatus])

  /**
   * Stop tracking completed jobs after a delay
   */
  useEffect(() => {
    const completedJobs = Array.from(trackedJobs.entries())
      .filter(([_, job]) => job.currentPhase === 'completed' || job.currentPhase === 'failed')

    if (completedJobs.length > 0) {
      // Remove completed jobs after 30 seconds
      const timeout = setTimeout(() => {
        setTrackedJobs(prev => {
          const updated = new Map(prev)
          completedJobs.forEach(([jobId]) => {
            updated.delete(jobId)
          })
          return updated
        })
      }, 30000)

      return () => clearTimeout(timeout)
    }
  }, [trackedJobs])

  return {
    queueImport,
    getJobStatus,
    getUserJobs,
    cancelJob,
    trackedJobs,
    queueStatus,
    isLoading,
    error
  }
}