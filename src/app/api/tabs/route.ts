import { NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserId } from '@/utils/supabase-server';
import { logger } from '@/utils/logger';
import { Tab } from '@/types/Tab';

/**
 * GET /api/tabs - Get all tabs for the current user
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      logger.warn('No user ID found for GET tabs request, falling back to local storage');
      // Return empty array instead of error to allow client-side fallback
      return NextResponse.json([]);
    }
    
    const { data: tabRecords, error } = await supabase
      .from('tabs')
      .select('*')
      .eq('user_id', userId)
      .order('date_added', { ascending: false });
    
    if (error) {
      logger.error('Error getting tabs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get tab tags
    const { data: tabTagRecords, error: tabTagError } = await supabase
      .from('tab_tags')
      .select('tab_id, tags(name)')
      .in('tab_id', tabRecords.map(tab => tab.id));
    
    if (tabTagError) {
      logger.error('Error getting tab tags:', tabTagError);
    }
    
    // Get suggested folders
    const { data: suggestedFolderRecords, error: suggestedFolderError } = await supabase
      .from('suggested_folders')
      .select('tab_id, folder_id')
      .in('tab_id', tabRecords.map(tab => tab.id));
    
    if (suggestedFolderError) {
      logger.error('Error getting suggested folders:', suggestedFolderError);
    }
    
    // Convert to Tab objects
    const tabs = tabRecords.map(tabRecord => {
      // Get tags for this tab in a type-safe way
      const tabTags: string[] = [];
      
      // Process tags with a simple approach ignoring the complex structure
      if (tabTagRecords && Array.isArray(tabTagRecords)) {
        const relevantTags = tabTagRecords.filter(tt => tt.tab_id === tabRecord.id);
        
        for (const tagRecord of relevantTags) {
          try {
            // Access as any to bypass TypeScript checking
            const tagsObj = tagRecord.tags as any;
            
            if (tagsObj) {
              // If it's a direct object with name property
              if (typeof tagsObj === 'object' && tagsObj.name) {
                tabTags.push(String(tagsObj.name));
              }
              // If it's an array of objects with name property
              else if (Array.isArray(tagsObj)) {
                for (const tag of tagsObj) {
                  if (tag && tag.name) {
                    tabTags.push(String(tag.name));
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error processing tag record:', e);
          }
        }
      }
      
      // Get suggested folders for this tab
      const suggestedFolders = suggestedFolderRecords
        ?.filter(sf => sf.tab_id === tabRecord.id)
        .map(sf => sf.folder_id) || [];
      
      return {
        id: tabRecord.id,
        title: tabRecord.title,
        url: tabRecord.url,
        domain: tabRecord.domain,
        dateAdded: tabRecord.date_added,
        summary: tabRecord.summary || '',
        category: tabRecord.category || 'uncategorized',
        screenshot: tabRecord.screenshot_url,
        status: tabRecord.status,
        tags: tabTags,
        folderId: tabRecord.folder_id,
        suggestedFolders: suggestedFolders
      } as Tab;
    });
    
    return NextResponse.json(tabs);
  } catch (error) {
    logger.error('Error in GET tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tabs - Create or update tab
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      logger.warn('No user ID found for POST tabs request, using anonymous user');
      // Create a temporary ID for this request
      const tempUserId = `anon-${Date.now()}`;
      return NextResponse.json({ 
        success: false, 
        error: 'No authenticated user',
        message: 'Your data was saved locally but not to the server. Refresh may lose data.'
      });
    }
    
    const tab = await request.json() as Tab;
    
    // Convert to database record
    const tabRecord = {
      id: tab.id,
      user_id: userId,
      folder_id: tab.folderId,
      title: tab.title.substring(0, 255),
      url: tab.url.substring(0, 2048),
      domain: tab.domain || '',
      date_added: tab.dateAdded,
      summary: tab.summary || '',
      category: tab.category || 'uncategorized',
      screenshot_url: tab.screenshot || null,
      status: tab.status
    };
    
    // Insert or update the tab
    const { data, error } = await supabase
      .from('tabs')
      .upsert(tabRecord)
      .select();
    
    if (error) {
      logger.error('Error saving tab:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Save tags if present
    if (tab.tags && tab.tags.length > 0) {
      try {
        // First, ensure all tags exist
        for (const tagName of tab.tags) {
          // Check if tag exists
          const { data: existingTags } = await supabase
            .from('tags')
            .select('id')
            .eq('user_id', userId)
            .eq('name', tagName)
            .limit(1);
          
          if (!existingTags || existingTags.length === 0) {
            // Create new tag
            await supabase
              .from('tags')
              .insert({ user_id: userId, name: tagName });
          }
        }
        
        // Get all tags
        const { data: tagData } = await supabase
          .from('tags')
          .select('id, name')
          .eq('user_id', userId)
          .in('name', tab.tags);
        
        // Delete existing tab_tags
        await supabase
          .from('tab_tags')
          .delete()
          .eq('tab_id', tab.id);
        
        // Insert new tab_tags
        if (tagData && tagData.length > 0) {
          const tabTags = tagData.map(tag => ({ tab_id: tab.id, tag_id: tag.id }));
          
          await supabase
            .from('tab_tags')
            .insert(tabTags);
        }
      } catch (tagError) {
        logger.error('Error saving tab tags:', tagError);
      }
    }
    
    // Save suggested folders if present
    if (tab.suggestedFolders && tab.suggestedFolders.length > 0) {
      try {
        // Delete existing suggested_folders
        await supabase
          .from('suggested_folders')
          .delete()
          .eq('tab_id', tab.id);
        
        // Insert new suggested_folders
        const suggestedFolders = tab.suggestedFolders.map(folderId => ({
          tab_id: tab.id,
          folder_id: folderId
        }));
        
        await supabase
          .from('suggested_folders')
          .insert(suggestedFolders);
      } catch (folderError) {
        logger.error('Error saving suggested folders:', folderError);
      }
    }
    
    return NextResponse.json({ success: true, id: tab.id });
  } catch (error) {
    logger.error('Error in POST tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tabs/:id - Delete a tab
 */
export async function DELETE(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getServerUserId();
    
    if (!userId) {
      logger.warn('No user ID found for DELETE tabs request');
      return NextResponse.json({ 
        success: false,
        error: 'No authenticated user',
        message: 'Unable to delete from server. Data may only be removed locally.'
      });
    }
    
    const url = new URL(request.url);
    const tabId = url.searchParams.get('id');
    
    if (!tabId) {
      return NextResponse.json({ error: 'Tab ID required' }, { status: 400 });
    }
    
    // Get the tab to check for screenshot
    const { data: tab, error: getError } = await supabase
      .from('tabs')
      .select('screenshot_url')
      .eq('id', tabId)
      .eq('user_id', userId) // Ensure the tab belongs to the user
      .single();
    
    if (getError && getError.code !== 'PGRST116') { // PGRST116 is not found
      logger.error('Error getting tab for deletion:', getError);
      return NextResponse.json({ error: getError.message }, { status: 500 });
    }
    
    if (tab?.screenshot_url) {
      // Extract filename from URL
      const url = new URL(tab.screenshot_url);
      const pathname = url.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      
      // Delete the screenshot
      await supabase.storage
        .from('tab-screenshots')
        .remove([`screenshots/${filename}`]);
    }
    
    // Delete tab tags
    await supabase
      .from('tab_tags')
      .delete()
      .eq('tab_id', tabId);
    
    // Delete suggested folders
    await supabase
      .from('suggested_folders')
      .delete()
      .eq('tab_id', tabId);
    
    // Delete the tab
    const { error } = await supabase
      .from('tabs')
      .delete()
      .eq('id', tabId)
      .eq('user_id', userId); // Ensure the tab belongs to the user
    
    if (error) {
      logger.error('Error deleting tab:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE tabs route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
