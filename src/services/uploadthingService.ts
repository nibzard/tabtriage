import { logger } from '@/utils/logger'
import { UTApi } from 'uploadthing/server'

/**
 * Service for handling file uploads to Uploadthing
 * Note: This service is for server-side operations. For client-side uploads,
 * use the UploadButton and UploadDropzone components from @/utils/uploadthing
 */

export interface UploadResponse {
  url: string
  key?: string
  name: string
  size: number
}

/**
 * Upload a file or blob to Uploadthing using the server-side UTApi
 * @param file - The file or blob to upload
 * @param filename - The filename to use
 * @param endpoint - The uploadthing endpoint to use (not used in direct API uploads)
 * @returns Upload response with URL
 */
export async function uploadToUploadthing(
  file: File | Blob,
  filename: string,
  endpoint: 'tabScreenshot' | 'tabImport' = 'tabScreenshot'
): Promise<UploadResponse | null> {
  try {
    // Initialize UTApi with token from environment
    const utapi = new UTApi()
    
    // Convert Blob to File if needed
    const fileToUpload = file instanceof File ? file : new File([file], filename, { type: file.type })
    
    logger.info(`Uploading ${filename} to Uploadthing via server API`)
    console.log(`INFO: Uploading ${filename} to Uploadthing via server API`)
    
    // Upload using UTApi
    const response = await utapi.uploadFiles([fileToUpload])
    
    if (response && response.length > 0 && response[0].data) {
      const uploadedFile = response[0].data
      logger.info(`Successfully uploaded ${filename} to ${uploadedFile.url}`)
      console.log(`INFO: Successfully uploaded ${filename} to ${uploadedFile.url}`)
      
      return {
        url: uploadedFile.url,
        key: uploadedFile.key,
        name: uploadedFile.name,
        size: uploadedFile.size
      }
    }
    
    // Check for errors in response
    if (response && response.length > 0 && response[0].error) {
      throw new Error(`Upload failed: ${response[0].error.message}`)
    }
    
    throw new Error('No upload result returned from UTApi')
  } catch (error) {
    logger.error(`Error uploading ${filename} to Uploadthing:`, error)
    console.error(`ERROR uploading ${filename} to Uploadthing:`, error)
    return null
  }
}

/**
 * Uploads a screenshot blob to Uploadthing
 * @param blob - The screenshot blob
 * @param url - The original URL (used for filename)
 * @param screenshotType - Type of screenshot (thumbnail or full)
 * @returns Upload response with URL
 */
export async function uploadScreenshot(blob: Blob, url: string, screenshotType: 'thumbnail' | 'full' = 'thumbnail'): Promise<string | null> {
  try {
    // Generate filename from URL
    const domain = getDomainFromUrl(url)
    const timestamp = Date.now()
    const typePrefix = screenshotType === 'full' ? 'full-screenshot' : 'screenshot'
    const filename = `${typePrefix}-${domain}-${timestamp}.jpg`

    const result = await uploadToUploadthing(blob, filename, 'tabScreenshot')
    
    if (result) {
      logger.info(`${screenshotType} screenshot uploaded successfully: ${result.url}`)
      return result.url
    }

    return null
  } catch (error) {
    logger.error(`Error uploading ${screenshotType} screenshot:`, error)
    return null
  }
}

/**
 * Uploads a tab import file to Uploadthing
 * @param file - The file to upload
 * @returns Upload response with URL
 */
export async function uploadTabImportFile(file: File): Promise<UploadResponse | null> {
  try {
    const result = await uploadToUploadthing(file, file.name, 'tabImport')
    
    if (result) {
      logger.info(`Tab import file uploaded successfully: ${result.url}`)
      return result
    }

    return null
  } catch (error) {
    logger.error('Error uploading tab import file:', error)
    return null
  }
}

/**
 * Downloads a file from a URL and uploads it to Uploadthing
 * @param url - The URL to download from
 * @param filename - The filename to use
 * @param endpoint - The uploadthing endpoint to use
 * @returns Upload response with URL
 */
export async function downloadAndUpload(
  url: string,
  filename: string,
  endpoint: 'tabScreenshot' | 'tabImport' = 'tabScreenshot'
): Promise<UploadResponse | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`)
    }

    const blob = await response.blob()
    return await uploadToUploadthing(blob, filename, endpoint)
  } catch (error) {
    logger.error('Error downloading and uploading:', error)
    return null
  }
}

/**
 * Extract domain from URL for filename generation
 */
function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '').replace(/[^a-zA-Z0-9]/g, '-')
  } catch {
    return 'unknown-domain'
  }
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop() || 'jpg'
  const baseName = originalName.split('.').slice(0, -1).join('.') || 'file'
  
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-')
  const prefixPart = prefix ? `${prefix}-` : ''
  
  return `${prefixPart}${cleanBaseName}-${timestamp}-${random}.${extension}`
}