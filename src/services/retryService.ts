import { logger } from '@/utils/logger';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: any) => boolean;
}

export class RetryableError extends Error {
  constructor(message: string, public shouldRetry = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Exponential backoff retry service
 */
export class RetryService {
  private static defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: (error) => {
      // Default retry logic
      if (error instanceof RetryableError) {
        return error.shouldRetry;
      }
      
      // Retry on network errors, timeouts, and 5xx errors
      return (
        error.name === 'TypeError' || // Network errors
        error.message?.includes('timeout') ||
        error.message?.includes('fetch') ||
        (error.status >= 500 && error.status < 600) ||
        error.status === 429 // Rate limiting
      );
    }
  };

  /**
   * Retry an async operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        
        // Log the error
        logger.warn(`Attempt ${attempt} failed:`, error);

        // Check if we should retry
        if (attempt === opts.maxAttempts || !opts.shouldRetry!(error)) {
          logger.error(`Operation failed after ${attempt} attempts`, error);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
          opts.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const finalDelay = delay + jitter;

        logger.info(`Retrying in ${Math.round(finalDelay)}ms... (attempt ${attempt + 1}/${opts.maxAttempts})`);
        await this.delay(finalDelay);
      }
    }

    throw lastError;
  }

  /**
   * Retry multiple operations in parallel with individual retry logic
   */
  static async retryBatch<T>(
    operations: Array<() => Promise<T>>,
    options: Partial<RetryOptions> = {},
    concurrency = 5
  ): Promise<Array<{ success: boolean; result?: T; error?: any; index: number }>> {
    const results: Array<{ success: boolean; result?: T; error?: any; index: number }> = [];

    // Process in chunks to limit concurrency
    for (let i = 0; i < operations.length; i += concurrency) {
      const chunk = operations.slice(i, i + concurrency);
      const chunkPromises = chunk.map(async (operation, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        try {
          const result = await this.retry(operation, options);
          return { success: true, result, index: globalIndex };
        } catch (error) {
          return { success: false, error, index: globalIndex };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Circuit breaker pattern for failing services
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000 // 5 minutes
    }
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset failure count if monitoring period has passed
      if (now - lastFailureTime > options.monitoringPeriod) {
        failures = 0;
        isOpen = false;
      }

      // If circuit is open, check if we should try again
      if (isOpen) {
        if (now - lastFailureTime < options.recoveryTimeout) {
          throw new Error('Circuit breaker is open - service temporarily unavailable');
        }
        // Try to close the circuit
        isOpen = false;
        failures = 0;
      }

      try {
        const result = await operation();
        // Success - reset failure count
        failures = 0;
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        // Open circuit if threshold reached
        if (failures >= options.failureThreshold) {
          isOpen = true;
          logger.error(`Circuit breaker opened after ${failures} failures`);
        }

        throw error;
      }
    };
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Specialized retry service for tab import operations
 */
export class TabImportRetryService extends RetryService {
  /**
   * Retry tab import with specific error handling
   */
  static async retryTabImport(
    tabs: any[],
    importFn: (tabs: any[]) => Promise<any>
  ): Promise<any> {
    return this.retry(
      () => importFn(tabs),
      {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 10000,
        shouldRetry: (error) => {
          // Don't retry validation errors
          if (error.message?.includes('Invalid input') || 
              error.message?.includes('required') ||
              error.status === 400) {
            return false;
          }
          
          // Retry network and server errors
          return error.status >= 500 || 
                 error.name === 'TypeError' ||
                 error.message?.includes('timeout');
        }
      }
    );
  }

  /**
   * Retry screenshot capture with exponential backoff
   */
  static async retryScreenshot(
    url: string,
    screenshotFn: (url: string) => Promise<any>
  ): Promise<any> {
    return this.retry(
      () => screenshotFn(url),
      {
        maxAttempts: 2, // Screenshots are expensive, limit retries
        baseDelay: 3000,
        maxDelay: 15000,
        shouldRetry: (error) => {
          // Don't retry for invalid URLs
          if (error.message?.includes('Invalid URL') ||
              error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
            return false;
          }
          return true;
        }
      }
    );
  }

  /**
   * Retry AI operations (summarization, categorization)
   */
  static async retryAI(
    operation: () => Promise<any>
  ): Promise<any> {
    return this.retry(
      operation,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        shouldRetry: (error) => {
          // Don't retry quota exceeded errors
          if (error.message?.includes('quota') ||
              error.message?.includes('rate limit') ||
              error.status === 429) {
            return false;
          }
          return true;
        }
      }
    );
  }
}