/**
 * Embedding Cache Service
 * Provides LRU caching for query embeddings to improve search performance
 */

interface CacheEntry {
  embedding: number[]
  task: string
  timestamp: number
  accessCount: number
}

interface CacheStats {
  size: number
  maxSize: number
  hitRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
}

export class EmbeddingCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private stats = {
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0
  }

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  /**
   * Get cached embedding or return null if not found
   */
  get(query: string, task: string): number[] | null {
    this.stats.totalRequests++
    const key = this.createKey(query, task)
    const entry = this.cache.get(key)
    
    if (entry) {
      // Update access tracking for LRU
      entry.accessCount++
      entry.timestamp = Date.now()
      
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, entry)
      
      this.stats.totalHits++
      return entry.embedding
    }
    
    this.stats.totalMisses++
    return null
  }

  /**
   * Store embedding in cache
   */
  set(query: string, task: string, embedding: number[]): void {
    const key = this.createKey(query, task)
    const entry: CacheEntry = {
      embedding: [...embedding], // Create copy to avoid mutation
      task,
      timestamp: Date.now(),
      accessCount: 1
    }
    
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    
    // Add new entry
    this.cache.set(key, entry)
    
    // Evict oldest entries if over capacity
    this.evictIfNeeded()
  }

  /**
   * Check if embedding exists in cache
   */
  has(query: string, task: string): boolean {
    return this.cache.has(this.createKey(query, task))
  }

  /**
   * Clear all cached embeddings
   */
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  /**
   * Remove entries older than specified age (in milliseconds)
   */
  evictOldEntries(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge
    let evicted = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < cutoff) {
        this.cache.delete(key)
        evicted++
      }
    }
    
    return evicted
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.totalHits / this.stats.totalRequests) * 100 
      : 0

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.stats.totalRequests,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0
    }
  }

  /**
   * Get cache contents for debugging
   */
  debug(): Array<{key: string, task: string, age: number, accessCount: number}> {
    const now = Date.now()
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.split(':')[0], // Remove task from key for readability
      task: entry.task,
      age: now - entry.timestamp,
      accessCount: entry.accessCount
    }))
  }

  private createKey(query: string, task: string): string {
    // Normalize query for consistent caching
    const normalizedQuery = query.trim().toLowerCase()
    return `${normalizedQuery}:${task}`
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxSize) {
      return
    }

    // Convert to array and sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    // Remove oldest entries until we're under the limit
    const toRemove = this.cache.size - this.maxSize
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }
  }
}

// Global cache instance
const globalEmbeddingCache = new EmbeddingCache(1000)

export { globalEmbeddingCache }
export default EmbeddingCache