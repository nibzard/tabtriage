import { logger } from '@/utils/logger';

export interface ImportJob {
  id: string;
  batchId: string;
  tabs: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalTabs: number;
  successfulTabs: number;
  failedTabs: number;
  errors: Array<{ url: string; error: string }>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface ImportProgress {
  batchId: string;
  status: ImportJob['status'];
  progress: number;
  totalTabs: number;
  successfulTabs: number;
  failedTabs: number;
  currentTab?: string;
  estimatedTimeRemaining?: number;
}

class ImportQueueService {
  private queue: Map<string, ImportJob> = new Map();
  private progressCallbacks: Map<string, (progress: ImportProgress) => void> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 25;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    // Start processing loop
    this.startProcessing();
  }

  /**
   * Add a new import job to the queue
   */
  async enqueue(batchId: string, tabs: any[]): Promise<ImportJob> {
    const job: ImportJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      batchId,
      tabs,
      status: 'pending',
      progress: 0,
      totalTabs: tabs.length,
      successfulTabs: 0,
      failedTabs: 0,
      errors: [],
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES
    };

    this.queue.set(job.id, job);
    logger.info(`Import job ${job.id} enqueued with ${tabs.length} tabs`);

    // Trigger processing
    this.processNext();

    return job;
  }

  /**
   * Get the current status of an import job
   */
  getJobStatus(jobId: string): ImportJob | undefined {
    return this.queue.get(jobId);
  }

  /**
   * Get import progress by batch ID
   */
  getProgress(batchId: string): ImportProgress | undefined {
    const job = Array.from(this.queue.values()).find(j => j.batchId === batchId);
    if (!job) return undefined;

    return {
      batchId: job.batchId,
      status: job.status,
      progress: job.progress,
      totalTabs: job.totalTabs,
      successfulTabs: job.successfulTabs,
      failedTabs: job.failedTabs,
      estimatedTimeRemaining: this.estimateTimeRemaining(job)
    };
  }

  /**
   * Subscribe to progress updates for a batch
   */
  subscribeToProgress(batchId: string, callback: (progress: ImportProgress) => void): () => void {
    this.progressCallbacks.set(batchId, callback);
    
    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(batchId);
    };
  }

  /**
   * Start the processing loop
   */
  private startProcessing() {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processNext();
    }, 1000); // Check every second
  }

  /**
   * Process the next job in the queue
   */
  private async processNext() {
    // Find next pending job
    const pendingJob = Array.from(this.queue.values()).find(j => j.status === 'pending');
    if (!pendingJob) return;

    // Start processing
    pendingJob.status = 'processing';
    pendingJob.startedAt = new Date();
    this.updateProgress(pendingJob);

    try {
      await this.processJob(pendingJob);
    } catch (error) {
      logger.error(`Failed to process job ${pendingJob.id}:`, error);
      pendingJob.status = 'failed';
      this.updateProgress(pendingJob);
    }
  }

  /**
   * Process a single import job
   */
  private async processJob(job: ImportJob) {
    logger.info(`Processing import job ${job.id} with ${job.tabs.length} tabs`);

    // Process tabs in batches
    for (let i = 0; i < job.tabs.length; i += this.BATCH_SIZE) {
      const batch = job.tabs.slice(i, i + this.BATCH_SIZE);
      
      try {
        // Call the batch import API
        const response = await fetch('/api/tabs/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            tabs: batch,
            skipDuplicates: true 
          }),
        });

        if (!response.ok) {
          throw new Error(`Batch import failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Update job statistics
        job.successfulTabs += result.successful.length;
        job.failedTabs += result.failed.length;
        job.errors.push(...result.failed.map((f: any) => ({ 
          url: f.url, 
          error: f.error 
        })));
        
        // Update progress
        job.progress = Math.round(((i + batch.length) / job.tabs.length) * 100);
        this.updateProgress(job);

        // Small delay between batches to avoid overwhelming the server
        await this.delay(500);
        
      } catch (error) {
        logger.error(`Batch processing failed for job ${job.id}:`, error);
        
        // Retry logic
        if (job.retryCount < job.maxRetries) {
          job.retryCount++;
          logger.info(`Retrying job ${job.id} (attempt ${job.retryCount}/${job.maxRetries})`);
          await this.delay(this.RETRY_DELAY * job.retryCount);
          i -= this.BATCH_SIZE; // Retry the same batch
        } else {
          // Mark remaining tabs as failed
          const remainingTabs = job.tabs.slice(i);
          job.failedTabs += remainingTabs.length;
          job.errors.push(...remainingTabs.map(tab => ({
            url: tab.url,
            error: 'Max retries exceeded'
          })));
          break;
        }
      }
    }

    // Mark job as completed
    job.status = job.failedTabs === 0 ? 'completed' : 'failed';
    job.completedAt = new Date();
    job.progress = 100;
    this.updateProgress(job);

    logger.info(`Import job ${job.id} completed: ${job.successfulTabs} successful, ${job.failedTabs} failed`);

    // Clean up old completed jobs after 1 hour
    setTimeout(() => {
      this.queue.delete(job.id);
    }, 3600000);
  }

  /**
   * Update progress and notify subscribers
   */
  private updateProgress(job: ImportJob) {
    const progress: ImportProgress = {
      batchId: job.batchId,
      status: job.status,
      progress: job.progress,
      totalTabs: job.totalTabs,
      successfulTabs: job.successfulTabs,
      failedTabs: job.failedTabs,
      estimatedTimeRemaining: this.estimateTimeRemaining(job)
    };

    // Notify subscriber if exists
    const callback = this.progressCallbacks.get(job.batchId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Estimate time remaining for a job
   */
  private estimateTimeRemaining(job: ImportJob): number | undefined {
    if (!job.startedAt || job.status !== 'processing') return undefined;

    const elapsed = Date.now() - job.startedAt.getTime();
    const tabsProcessed = job.successfulTabs + job.failedTabs;
    
    if (tabsProcessed === 0) return undefined;

    const avgTimePerTab = elapsed / tabsProcessed;
    const tabsRemaining = job.totalTabs - tabsProcessed;
    
    return Math.round(avgTimePerTab * tabsRemaining);
  }

  /**
   * Helper function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop the processing loop (for cleanup)
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Export singleton instance
export const importQueueService = new ImportQueueService();