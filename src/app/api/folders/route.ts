import { NextResponse } from 'next/server';
import { db, generateId } from '@/db/client';
import { folders } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { ensureUserExists } from '@/utils/ensure-user';

// Simple session management (replace with proper auth later)
async function getCurrentUserId(): Promise<string> {
  const userId = 'user_001';
  await ensureUserExists(userId);
  return userId;
}

/**
 * GET /api/folders - Get all folders for the current user
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    
    const userFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(desc(folders.createdAt));
    
    // Transform to match frontend Folder interface
    const transformedFolders = userFolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      color: folder.color || '#6366f1',
      icon: folder.icon || 'folder',
      createdAt: folder.createdAt || new Date().toISOString(),
      updatedAt: folder.updatedAt || new Date().toISOString()
    }));
    
    return NextResponse.json(transformedFolders);
  } catch (error) {
    logger.error('Error in GET folders route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/folders - Create or update folder
 */
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    
    let folderData;
    try {
      folderData = await request.json();
    } catch (error) {
      logger.error('Invalid JSON in request body:', error);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    if (!folderData || !folderData.name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }
    
    // Ensure folder has an ID
    const folderId = folderData.id || generateId();
    
    const folderRecord = {
      id: folderId,
      userId: userId,
      name: folderData.name,
      color: folderData.color || '#6366f1',
      icon: folderData.icon || 'folder',
      createdAt: folderData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Insert or update the folder
    await db
      .insert(folders)
      .values(folderRecord)
      .onConflictDoUpdate({
        target: folders.id,
        set: {
          name: folderRecord.name,
          color: folderRecord.color,
          icon: folderRecord.icon,
          updatedAt: folderRecord.updatedAt
        }
      });
    
    return NextResponse.json({ success: true, id: folderId });
  } catch (error) {
    logger.error('Error in POST folders route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/folders - Delete a folder
 */
export async function DELETE(request: Request) {
  try {
    const userId = getCurrentUserId();
    const url = new URL(request.url);
    const folderId = url.searchParams.get('id');
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }
    
    // Delete the folder (ensure it belongs to the user)
    // Note: tabs.folder_id will be set to NULL due to ON DELETE SET NULL
    await db
      .delete(folders)
      .where(and(
        eq(folders.id, folderId),
        eq(folders.userId, userId)
      ));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE folders route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}