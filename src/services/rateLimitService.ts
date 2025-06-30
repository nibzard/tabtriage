import { logger } from '@/utils/logger'

export interface RateLimitConfig {
  requestsPerMinute: number
  burstLimit?: number
}

export interface QueuedRequest<T> {
  id: string
  operation: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: any) => void
  addedAt: number
  priority?: number
}

/**
 * Rate limiting service with configurable RPM limits and request queuing
 */
export class RateLimitService<T = any> {
  private queue: QueuedRequest<T>[] = []
  private requestHistory: number[] = []
  private processing = false
  private nextRequestId = 1

  constructor(
    private serviceName: string,
    private config: RateLimitConfig
  ) {}

  /**
   * Add a request to the rate-limited queue
   */
  async enqueue(
    operation: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${this.serviceName}-${this.nextRequestId++}`,
        operation,
        resolve,
        reject,
        addedAt: Date.now(),
        priority
      }

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(r => (r.priority || 0) < priority)
      if (insertIndex === -1) {
        this.queue.push(request)
      } else {
        this.queue.splice(insertIndex, 0, request)
      }

      logger.debug(`Queued ${this.serviceName} request ${request.id} (priority: ${priority}, queue length: ${this.queue.length})`)
      
      this.processQueue()
    })
  }

  /**
   * Process the queue respecting rate limits
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const oneMinuteAgo = now - 60000

      // Clean old requests from history
      this.requestHistory = this.requestHistory.filter(time => time > oneMinuteAgo)

      // Check if we can make a request
      if (this.requestHistory.length >= this.config.requestsPerMinute) {
        const oldestRequest = Math.min(...this.requestHistory)
        const waitTime = 60000 - (now - oldestRequest) + 100 // Add 100ms buffer
        
        logger.debug(`${this.serviceName} rate limit reached, waiting ${waitTime}ms`)
        await this.delay(waitTime)
        continue
      }

      // Process next request
      const request = this.queue.shift()!
      this.requestHistory.push(now)

      try {
        logger.debug(`Processing ${this.serviceName} request ${request.id}`)
        const result = await request.operation()
        request.resolve(result)
      } catch (error) {
        logger.warn(`${this.serviceName} request ${request.id} failed:`, error)
        request.reject(error)
      }

      // Add small delay between requests to avoid bursting
      await this.delay(100)
    }

    this.processing = false
  }

  /**
   * Get current queue status
   */
  getStatus() {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentRequests = this.requestHistory.filter(time => time > oneMinuteAgo).length

    return {
      serviceName: this.serviceName,
      queueLength: this.queue.length,
      requestsInLastMinute: recentRequests,
      requestsPerMinute: this.config.requestsPerMinute,
      isProcessing: this.processing,
      nextRequestIn: this.getNextRequestDelay()
    }
  }

  /**
   * Calculate delay until next request can be made
   */
  private getNextRequestDelay(): number {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentRequests = this.requestHistory.filter(time => time > oneMinuteAgo)

    if (recentRequests.length < this.config.requestsPerMinute) {
      return 0
    }

    const oldestRequest = Math.min(...recentRequests)
    return Math.max(0, 60000 - (now - oldestRequest))
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    const cancelledCount = this.queue.length
    this.queue.forEach(request => {
      request.reject(new Error('Request cancelled due to queue clear'))
    })
    this.queue = []
    logger.info(`Cleared ${cancelledCount} pending ${this.serviceName} requests`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Global rate limit manager for all services
 */
export class GlobalRateLimitManager {
  private static instance: GlobalRateLimitManager
  private services = new Map<string, RateLimitService>()

  private constructor() {}

  static getInstance(): GlobalRateLimitManager {
    if (!this.instance) {
      this.instance = new GlobalRateLimitManager()
    }
    return this.instance
  }

  /**
   * Get or create a rate-limited service
   */
  getService<T>(serviceName: string, config: RateLimitConfig): RateLimitService<T> {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, new RateLimitService<T>(serviceName, config))
    }
    return this.services.get(serviceName) as RateLimitService<T>
  }

  /**
   * Get status of all services
   */
  getAllStatus() {
    const status: Record<string, any> = {}
    this.services.forEach((service, name) => {
      status[name] = service.getStatus()
    })
    return status
  }

  /**
   * Clear all service queues
   */
  clearAll(): void {
    this.services.forEach(service => service.clear())
    logger.info('Cleared all rate limit service queues')
  }
}

// Pre-configured rate limit services
export const RateLimitConfigs = {
  GEMINI: { requestsPerMinute: 60 }, // Conservative limit (half of 2000 RPM)
  JINA_EMBEDDINGS: { requestsPerMinute: 400 }, // 80% of 500 RPM limit
  SCREENSHOTS: { requestsPerMinute: 30 }, // Conservative for resource-intensive operations
  CONTENT_EXTRACTION: { requestsPerMinute: 100 } // Reasonable limit for content fetching
} as const