import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { tabs, folders, tags, tabTags, suggestedFolders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/utils/logger'
import { getCurrentUserId as getUser } from '@/utils/get-current-user'
import { ensureUserExists } from '@/utils/ensure-user'

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
    
    // Delete all user data in the correct order (respecting foreign key constraints)
    
    // 1. Delete tab-tag relationships for user's tabs
    const userTabIds = await db
      .select({ id: tabs.id })
      .from(tabs)
      .where(eq(tabs.userId, userId))
    
    const tabIds = userTabIds.map(tab => tab.id)
    
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
      tabIds: tabIds.length
    }
    
    logger.info(`Clear all data completed for user ${userId}:`, totalDeleted)
    
    return NextResponse.json({
      success: true,
      message: 'All user data cleared successfully',
      deleted: totalDeleted
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