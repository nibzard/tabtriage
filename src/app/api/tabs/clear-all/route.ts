import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { tabs, folders, tags, tabTags, suggestedFolders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/utils/logger'
import { getCurrentUserId as getUser } from '@/utils/get-current-user'
import { ensureUserExists } from '@/utils/ensure-user'
import { deleteFilesByUrls, listFiles, deleteFiles } from '@/services/uploadthingService'

// Simple session management (replace with proper auth later)
async function getCurrentUserId(request?: Request): Promise<string> {
  const userId = getUser(request)
  await ensureUserExists(userId)
  return userId
}

export async function DELETE(request: NextRequest) {
  try {
    // Get current user ID
    const userId = await getCurrentUserId(request)
    
    logger.info(`Starting clear all data operation for user: ${userId}`)
    
    // First, collect all image URLs that need to be deleted from Uploadthing
    const userTabsWithImages = await db
      .select({
        id: tabs.id,
        thumbnailUrl: tabs.thumbnailUrl,
        screenshotUrl: tabs.screenshotUrl,
        fullScreenshotUrl: tabs.fullScreenshotUrl
      })
      .from(tabs)
      .where(eq(tabs.userId, userId))
    
    // Collect all Uploadthing URLs for deletion
    const uploadthingUrls: string[] = []
    for (const tab of userTabsWithImages) {
      if (tab.thumbnailUrl?.includes('utfs.io')) {
        uploadthingUrls.push(tab.thumbnailUrl)
      }
      if (tab.screenshotUrl?.includes('utfs.io')) {
        uploadthingUrls.push(tab.screenshotUrl)
      }
      if (tab.fullScreenshotUrl?.includes('utfs.io')) {
        uploadthingUrls.push(tab.fullScreenshotUrl)
      }
    }
    
    // Delete images from Uploadthing before deleting database records
    let deletedImages = 0
    
    // Method 1: Delete images referenced in database
    if (uploadthingUrls.length > 0) {
      logger.info(`Deleting ${uploadthingUrls.length} database-referenced images from Uploadthing`)
      try {
        const deleteSuccess = await deleteFilesByUrls(uploadthingUrls)
        if (deleteSuccess) {
          deletedImages = uploadthingUrls.length
          logger.info(`Successfully deleted ${deletedImages} database-referenced images from Uploadthing`)
        } else {
          logger.warn('Some database-referenced images may not have been deleted from Uploadthing')
        }
      } catch (error) {
        logger.error('Error deleting database-referenced images from Uploadthing:', error)
        // Continue with orphaned file cleanup
      }
    }
    
    // Method 2: Clean up ALL orphaned files in UploadThing (nuclear option for clear-all)
    try {
      logger.info(`Checking for orphaned files in UploadThing...`)
      const allFiles = await listFiles()
      if (allFiles.length > 0) {
        logger.info(`Found ${allFiles.length} total files in UploadThing, deleting all...`)
        const allFileKeys = allFiles.map(file => file.key)
        const cleanupSuccess = await deleteFiles(allFileKeys)
        if (cleanupSuccess) {
          deletedImages += allFiles.length
          logger.info(`Successfully deleted ${allFiles.length} orphaned files from UploadThing`)
        } else {
          logger.warn('Some orphaned files may not have been deleted from UploadThing')
        }
      } else {
        logger.info('No orphaned files found in UploadThing')
      }
    } catch (error) {
      logger.error('Error cleaning up orphaned files from UploadThing:', error)
      // Continue with database deletion even if cleanup fails
    }
    
    // Delete all user data in the correct order (respecting foreign key constraints)
    const tabIds = userTabsWithImages.map(tab => tab.id)
    
    if (tabIds.length > 0) {
      // Delete suggested folders for user's tabs
      for (const tabId of tabIds) {
        await db.delete(suggestedFolders).where(eq(suggestedFolders.tabId, tabId))
      }
      
      // Delete tab-tag relationships
      for (const tabId of tabIds) {
        await db.delete(tabTags).where(eq(tabTags.tabId, tabId))
      }
    }
    
    // 2. Delete all user's tabs
    const deletedTabs = await db
      .delete(tabs)
      .where(eq(tabs.userId, userId))
      .returning({ id: tabs.id })
    
    // 3. Delete all user's folders
    const deletedFolders = await db
      .delete(folders)
      .where(eq(folders.userId, userId))
      .returning({ id: folders.id })
    
    // 4. Clean up orphaned tags (tags not used by any tabs)
    // This is optional since tags might be shared across users
    
    const totalDeleted = {
      tabs: deletedTabs.length,
      folders: deletedFolders.length,
      tabIds: tabIds.length,
      images: deletedImages
    }
    
    logger.info(`Clear all data completed for user ${userId}:`, totalDeleted)
    
    return NextResponse.json({
      success: true,
      message: 'All user data and uploaded images cleared successfully',
      deleted: totalDeleted,
      details: {
        databaseRecords: deletedTabs.length + deletedFolders.length,
        uploadedImages: deletedImages,
        totalStorageFreed: deletedImages > 0 ? `${deletedImages} images removed from cloud storage` : 'No images to remove'
      }
    })
    
  } catch (error) {
    logger.error('Error clearing all user data:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear user data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}