import { logger } from '@/utils/logger'
import { GlobalRateLimitManager } from './rateLimitService'

export interface BulkImportProgress {
  id: string
  totalTabs: number
  processedTabs: number
  failedTabs: number
  currentPhase: 'queued' | 'importing' | 'processing' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  estimatedTimeRemaining?: number
  errors: string[]
}

export interface BulkImportJob {
  id: string
  userId: string
  tabs: any[]
  progress: BulkImportProgress
  onProgress?: (progress: BulkImportProgress) => void
  createdAt: string
}

/**
 * Global import queue manager for handling large bulk imports
 */
export class BulkImportQueueManager {
  private static instance: BulkImportQueueManager
  private jobs = new Map<string, BulkImportJob>()
  private activeJobs = new Set<string>()
  private readonly MAX_CONCURRENT_JOBS = 2
  private jobIdCounter = 1

  private constructor() {}

  static getInstance(): BulkImportQueueManager {
    if (!this.instance) {
      this.instance = new BulkImportQueueManager()
    }
    return this.instance
  }

  /**
   * Queue a new bulk import job
   */
  async queueBulkImport(
    userId: string,
    tabs: any[],
    onProgress?: (progress: BulkImportProgress) => void
  ): Promise<string> {
    const jobId = `bulk-import-${this.jobIdCounter++}-${Date.now()}`
    
    const progress: BulkImportProgress = {
      id: jobId,
      totalTabs: tabs.length,
      processedTabs: 0,
      failedTabs: 0,
      currentPhase: 'queued',
      startedAt: new Date().toISOString(),
      errors: []
    }

    const job: BulkImportJob = {
      id: jobId,
      userId,
      tabs,
      progress,
      onProgress,
      createdAt: new Date().toISOString()
    }

    this.jobs.set(jobId, job)
    logger.info(`Queued bulk import job ${jobId} for user ${userId} with ${tabs.length} tabs`)

    // Start processing if we have capacity
    this.processQueuedJobs()

    return jobId
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(jobId: string): BulkImportProgress | null {
    const job = this.jobs.get(jobId)
    return job ? job.progress : null
  }

  /**
   * Get status of all jobs for a user
   */
  getUserJobs(userId: string): BulkImportProgress[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .map(job => job.progress)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job) return false

    if (job.progress.currentPhase === 'completed') {
      return false // Can't cancel completed jobs
    }

    job.progress.currentPhase = 'failed'
    job.progress.completedAt = new Date().toISOString()
    job.progress.errors.push('Job cancelled by user')
    
    this.activeJobs.delete(jobId)
    
    logger.info(`Cancelled bulk import job ${jobId}`)
    this.notifyProgress(job)
    
    return true
  }

  /**
   * Get global queue status
   */
  getQueueStatus() {
    const queuedJobs = Array.from(this.jobs.values())
      .filter(job => job.progress.currentPhase === 'queued').length
    
    const processingJobs = this.activeJobs.size
    
    const rateLimitStatus = GlobalRateLimitManager.getInstance().getAllStatus()

    return {
      queuedJobs,
      processingJobs,
      maxConcurrentJobs: this.MAX_CONCURRENT_JOBS,
      rateLimitStatus
    }
  }

  /**
   * Process queued jobs with concurrency control
   */
  private async processQueuedJobs(): Promise<void> {
    // Start new jobs if we have capacity
    while (this.activeJobs.size < this.MAX_CONCURRENT_JOBS) {
      const queuedJob = Array.from(this.jobs.values())
        .find(job => job.progress.currentPhase === 'queued')
      
      if (!queuedJob) break

      // Mark as active and start processing
      this.activeJobs.add(queuedJob.id)
      this.processJob(queuedJob).finally(() => {
        this.activeJobs.delete(queuedJob.id)
        // Try to start next job
        setTimeout(() => this.processQueuedJobs(), 100)
      })
    }
  }

  /**
   * Process a single bulk import job
   */
  private async processJob(job: BulkImportJob): Promise<void> {
    try {
      job.progress.currentPhase = 'importing'
      this.notifyProgress(job)

      // Phase 1: Import tabs to database
      logger.info(`Starting import phase for job ${job.id}`)
      const importedTabIds = await this.importTabsToDatabase(job)
      
      if (importedTabIds.length === 0) {
        throw new Error('No tabs were successfully imported')
      }

      job.progress.currentPhase = 'processing'
      this.notifyProgress(job)

      // Phase 2: Process tabs with AI and screenshots
      logger.info(`Starting processing phase for job ${job.id}`)
      await this.processTabsWithServices(job, importedTabIds)

      // Complete the job
      job.progress.currentPhase = 'completed'
      job.progress.completedAt = new Date().toISOString()
      logger.info(`Completed bulk import job ${job.id}`)
      
    } catch (error) {
      logger.error(`Bulk import job ${job.id} failed:`, error)
      job.progress.currentPhase = 'failed'
      job.progress.completedAt = new Date().toISOString()
      job.progress.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    this.notifyProgress(job)
  }

  /**
   * Import tabs to database
   */
  private async importTabsToDatabase(job: BulkImportJob): Promise<string[]> {
    const importedIds: string[] = []
    const batchSize = 50

    for (let i = 0; i < job.tabs.length; i += batchSize) {
      const batch = job.tabs.slice(i, i + batchSize)
      
      try {
        // Call the existing batch import API
        const response = await fetch('/api/tabs/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tabs: batch,
            userId: job.userId
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Import API error: ${response.status} - ${error}`)
        }

        const result = await response.json()
        importedIds.push(...(result.tabIds || []))
        
        job.progress.processedTabs = Math.min(i + batch.length, job.tabs.length)
        this.notifyProgress(job)

        // Small delay between batches
        await this.delay(200)
        
      } catch (error) {
        logger.error(`Failed to import batch ${i}-${i + batch.length} for job ${job.id}:`, error)
        job.progress.failedTabs += batch.length
        job.progress.errors.push(`Import batch ${i}-${i + batch.length} failed: ${error}`)
      }
    }

    return importedIds
  }

  /**
   * Process tabs with AI services and screenshots
   */
  private async processTabsWithServices(job: BulkImportJob, tabIds: string[]): Promise<void> {
    const batchSize = 25

    for (let i = 0; i < tabIds.length; i += batchSize) {
      const batch = tabIds.slice(i, i + batchSize)
      
      try {
        // Call the existing process-batch API
        const response = await fetch('/api/tabs/process-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tabIds: batch,
            userId: job.userId,
            importBatchId: job.id,
            processType: 'full'
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Process API error: ${response.status} - ${error}`)
        }

        const result = await response.json()
        job.progress.failedTabs += result.failed || 0
        
        // Update progress (processing phase counts differently)
        const processedInPhase = Math.min(i + batch.length, tabIds.length)
        job.progress.processedTabs = Math.floor((processedInPhase / tabIds.length) * job.tabs.length)
        
        // Calculate estimated time remaining
        if (i > 0) {
          const elapsed = Date.now() - new Date(job.progress.startedAt).getTime()
          const rate = processedInPhase / elapsed
          const remaining = (tabIds.length - processedInPhase) / rate
          job.progress.estimatedTimeRemaining = Math.round(remaining / 1000) // seconds
        }
        
        this.notifyProgress(job)

        // Longer delay for processing batches (rate limiting)
        await this.delay(500)
        
      } catch (error) {
        logger.error(`Failed to process batch ${i}-${i + batchSize} for job ${job.id}:`, error)
        job.progress.failedTabs += batch.length
        job.progress.errors.push(`Processing batch ${i}-${i + batchSize} failed: ${error}`)
      }
    }
  }

  /**
   * Notify job progress to callback
   */
  private notifyProgress(job: BulkImportJob): void {
    if (job.onProgress) {
      try {
        job.onProgress(job.progress)
      } catch (error) {
        logger.error(`Error calling progress callback for job ${job.id}:`, error)
      }
    }
  }

  /**
   * Clean up old completed jobs (keep for 24 hours)
   */
  cleanupOldJobs(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    
    for (const [jobId, job] of this.jobs) {
      if (job.progress.currentPhase === 'completed' || job.progress.currentPhase === 'failed') {
        const completedAt = job.progress.completedAt ? new Date(job.progress.completedAt).getTime() : 0
        if (completedAt < oneDayAgo) {
          this.jobs.delete(jobId)
          logger.debug(`Cleaned up old job ${jobId}`)
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const bulkImportQueue = BulkImportQueueManager.getInstance()

// Clean up old jobs every hour
setInterval(() => {
  bulkImportQueue.cleanupOldJobs()
}, 60 * 60 * 1000)