import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserId } from '@/utils/supabase-server';
import { logger } from '@/utils/logger';
import { Folder } from '@/types/Folder';

/**
 * GET /api/folders - Get all folders for the current user
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: folderRecords, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    
    if (error) {
      logger.error('Error getting folders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Convert to Folder objects
    const folders = folderRecords.map(record => ({
      id: record.id,
      name: record.name,
      color: record.color,
      icon: record.icon
    }));
    
    return NextResponse.json(folders);
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
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const folder = await request.json() as Folder;
    
    // Convert to database record
    const folderRecord = {
      id: folder.id,
      user_id: userId,
      name: folder.name || 'Untitled Folder',
      color: folder.color || null,
      icon: folder.icon || null
    };
    
    // Insert or update the folder
    const { data, error } = await supabase
      .from('folders')
      .upsert(folderRecord)
      .select();
    
    if (error) {
      logger.error('Error saving folder:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, id: folder.id });
  } catch (error) {
    logger.error('Error in POST folders route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/folders/:id - Delete a folder
 */
export async function DELETE(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const folderId = url.searchParams.get('id');
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }
    
    // Update tabs that were in this folder
    await supabase
      .from('tabs')
      .update({ folder_id: null })
      .eq('folder_id', folderId)
      .eq('user_id', userId);
    
    // Delete the folder
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId); // Ensure the folder belongs to the user
    
    if (error) {
      logger.error('Error deleting folder:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE folders route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
