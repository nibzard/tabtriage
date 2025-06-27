import { logger } from '@/utils/logger'
import { uploadScreenshot, uploadTabImportFile, UploadResponse } from './uploadthingService'

/**
 * Unified file storage service that abstracts storage providers
 */

export interface StorageConfig {
  provider: 'uploadthing' | 'local' | 'r2'
  fallbackToLocal?: boolean
}

export interface FileUploadResult {
  url: string
  key?: string
  provider: string
  size?: number
}

class FileStorageService {
  private config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config
  }

  /**
   * Store a screenshot image
   */
  async storeScreenshot(blob: Blob, originalUrl: string, screenshotType: 'thumbnail' | 'full' = 'thumbnail'): Promise<string | null> {
    switch (this.config.provider) {
      case 'uploadthing':
        return await this.storeWithUploadthing(blob, originalUrl, 'screenshot', screenshotType)
      
      case 'local':
        return await this.storeLocally(blob, originalUrl, 'screenshot')
      
      case 'r2':
        // TODO: Implement R2 storage
        logger.warn('R2 storage not yet implemented, falling back to local')
        return await this.storeLocally(blob, originalUrl, 'screenshot')
      
      default:
        logger.error(`Unknown storage provider: ${this.config.provider}`)
        return null
    }
  }

  /**
   * Store an import file
   */
  async storeImportFile(file: File): Promise<UploadResponse | null> {
    switch (this.config.provider) {
      case 'uploadthing':
        return await uploadTabImportFile(file)
      
      case 'local':
        // For import files, we typically process them directly without storage
        logger.info('Local provider used for import file - processing directly')
        return {
          url: URL.createObjectURL(file),
          key: `local-${Date.now()}`,
          name: file.name,
          size: file.size
        }
      
      case 'r2':
        // TODO: Implement R2 storage
        logger.warn('R2 storage not yet implemented for import files')
        return null
      
      default:
        logger.error(`Unknown storage provider: ${this.config.provider}`)
        return null
    }
  }

  /**
   * Migrate a data URL screenshot to cloud storage
   */
  async migrateDataUrlToCloud(dataUrl: string, originalUrl: string): Promise<string | null> {
    try {
      if (!dataUrl.startsWith('data:')) {
        logger.warn('Not a data URL, skipping migration')
        return dataUrl // Already a URL, no migration needed
      }

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      // Store using current provider
      const cloudUrl = await this.storeScreenshot(blob, originalUrl)
      
      if (cloudUrl) {
        logger.info(`Successfully migrated screenshot for ${originalUrl}`)
        return cloudUrl
      } else {
        logger.warn(`Failed to migrate screenshot for ${originalUrl}`)
        return dataUrl // Fallback to original data URL
      }
    } catch (error) {
      logger.error('Error migrating data URL to cloud:', error)
      return dataUrl // Fallback to original data URL
    }
  }

  /**
   * Store with Uploadthing
   */
  private async storeWithUploadthing(blob: Blob, originalUrl: string, type: 'screenshot' | 'import', screenshotType?: 'thumbnail' | 'full'): Promise<string | null> {
    try {
      if (type === 'screenshot') {
        return await uploadScreenshot(blob, originalUrl, screenshotType)
      } else {
        // For import files, convert blob to file
        const file = new File([blob], `import-${Date.now()}.txt`, { type: blob.type })
        const result = await uploadTabImportFile(file)
        return result?.url || null
      }
    } catch (error) {
      logger.error('Error storing with Uploadthing:', error)
      
      if (this.config.fallbackToLocal) {
        logger.info('Falling back to local storage')
        return await this.storeLocally(blob, originalUrl, type)
      }
      
      return null
    }
  }

  /**
   * Store locally (as data URL)
   */
  private async storeLocally(blob: Blob, originalUrl: string, type: 'screenshot' | 'import'): Promise<string | null> {
    try {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      logger.error('Error storing locally:', error)
      return null
    }
  }

  /**
   * Check if a URL is a data URL (local storage)
   */
  isDataUrl(url: string): boolean {
    return url.startsWith('data:')
  }

  /**
   * Check if a URL is from Uploadthing
   */
  isUploadthingUrl(url: string): boolean {
    return url.includes('uploadthing.com') || url.includes('utfs.io')
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number
    dataUrls: number
    cloudUrls: number
    provider: string
  }> {
    // This would need to be implemented based on your data source
    // For now, return basic stats
    return {
      totalFiles: 0,
      dataUrls: 0,
      cloudUrls: 0,
      provider: this.config.provider
    }
  }
}

// Create singleton instance
const getStorageProvider = (): 'uploadthing' | 'local' | 'r2' => {
  const provider = process.env.STORAGE_PROVIDER || 'local'
  return provider as 'uploadthing' | 'local' | 'r2'
}

export const fileStorageService = new FileStorageService({
  provider: getStorageProvider(),
  fallbackToLocal: true
})

/**
 * Batch migration utility for moving existing data URLs to cloud storage
 */
export class StorageMigrationService {
  private storageService: FileStorageService

  constructor(storageService: FileStorageService) {
    this.storageService = storageService
  }

  /**
   * Migrate all data URL screenshots to cloud storage
   */
  async migrateScreenshots(tabs: Array<{ id: string; screenshot?: string; url: string }>): Promise<{
    migrated: number
    failed: number
    skipped: number
  }> {
    const stats = { migrated: 0, failed: 0, skipped: 0 }

    for (const tab of tabs) {
      if (!tab.screenshot) {
        stats.skipped++
        continue
      }

      if (!this.storageService.isDataUrl(tab.screenshot)) {
        stats.skipped++
        continue
      }

      try {
        const cloudUrl = await this.storageService.migrateDataUrlToCloud(tab.screenshot, tab.url)
        
        if (cloudUrl && cloudUrl !== tab.screenshot) {
          // Update the tab with the new URL
          // This would typically involve updating your database
          logger.info(`Migrated screenshot for tab ${tab.id}`)
          stats.migrated++
        } else {
          stats.failed++
        }
      } catch (error) {
        logger.error(`Failed to migrate screenshot for tab ${tab.id}:`, error)
        stats.failed++
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return stats
  }
}

export const storageMigrationService = new StorageMigrationService(fileStorageService)