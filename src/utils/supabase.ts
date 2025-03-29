import { createClient } from '@supabase/supabase-js'
import { Tab } from '@/types/Tab'
import { Folder } from '@/types/Folder'
import { logger } from '@/utils/logger'
import { generateTabEmbedding } from '@/services/embeddingService'
import { v4 as uuidv4 } from 'uuid'

// Define database types
export type TabRecord = {
  id: string
  user_id: string
  folder_id?: string
  title: string
  url: string
  domain: string
  date_added: string
  summary?: string
  category?: string
  screenshot_url?: string
  status: 'unprocessed' | 'kept' | 'discarded'
  created_at: string
  updated_at: string
}

export type FolderRecord = {
  id: string
  user_id: string
  name: string
  color?: string
  icon?: string
  created_at: string
  updated_at: string
}

export type TagRecord = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type TabTagRecord = {
  tab_id: string
  tag_id: string
}

export type SuggestedFolderRecord = {
  tab_id: string
  folder_id: string
}

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Log Supabase configuration (without exposing full keys)
console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 8)}...` : 'undefined')
console.log('Supabase Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 5)}...` : 'undefined')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error)
  } else {
    console.log('Supabase connection successful, session:', data.session ? 'Active' : 'None')
  }
})

// Storage bucket for tab screenshots
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'tab-screenshots'

/**
 * Helper function to ensure a user profile exists
 */
async function ensureUserProfileExists(userId: string): Promise<boolean> {
  try {
    // Validate userId format
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      console.error('Invalid UUID for user profile:', userId)
      return false
    }
    
    // Check if user profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
      
    if (!profileError) {
      return true // Profile exists
    }
    
    // If profile not found, create a new one
    if (profileError.code === 'PGRST116') {
      console.log('Profile not found, creating a new one')
      
      const randomId = Date.now().toString().slice(-8)
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: `user-${randomId}@example.com`,
          display_name: 'Auto-created User'
        })
      
      if (createError) {
        console.error('Error creating profile:', createError)
        return false
      }
      
      return true
    }
    
    // Any other error
    console.error('Error checking profile:', profileError)
    return false
  } catch (error) {
    console.error('Exception in ensureUserProfileExists:', error)
    return false
  }
}

// Upload a screenshot to Supabase Storage
export async function uploadScreenshot(
  imageBlob: Blob,
  fileName: string
): Promise<string | null> {
  try {
    logger.debug(`Uploading screenshot: ${fileName}`)
    console.log(`DEBUG: Uploading screenshot: ${fileName}, size: ${imageBlob.size} bytes`)

    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return null
    }
    
    console.log('Available buckets:', buckets.map(b => b.name))
    
    if (!buckets.some(b => b.name === STORAGE_BUCKET)) {
      console.error(`Bucket '${STORAGE_BUCKET}' does not exist`)
      
      // Try to create the bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true
      })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        return null
      }
      
      console.log('Created new bucket:', newBucket)
    }

    // Upload the image to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(`screenshots/${fileName}`, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (error) {
      logger.error('Error uploading screenshot:', error)
      console.error('Error uploading screenshot:', error)
      
      // Check for specific errors
      if (error.message.includes('bucket') || error.message.includes('unauthorized')) {
        console.error('This might be a permissions issue. Check RLS policies and bucket configuration.')
      }
      
      return null
    }

    console.log('Upload successful, data:', data)

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(`screenshots/${fileName}`)

    logger.debug(`Screenshot uploaded successfully: ${publicUrl}`)
    console.log(`DEBUG: Screenshot uploaded successfully: ${publicUrl}`)
    
    // Verify the image is accessible
    try {
      const testFetch = await fetch(publicUrl, { method: 'HEAD' })
      console.log(`Image accessibility check: ${testFetch.status} ${testFetch.statusText}`)
    } catch (fetchError) {
      console.warn('Could not verify image accessibility:', fetchError)
    }
    
    return publicUrl
  } catch (error) {
    logger.error('Error in uploadScreenshot:', error)
    console.error('Error in uploadScreenshot:', error)
    return null
  }
}

// Delete a screenshot from Supabase Storage
export async function deleteScreenshot(fileName: string): Promise<boolean> {
  try {
    logger.debug(`Deleting screenshot: ${fileName}`)

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([`screenshots/${fileName}`])

    if (error) {
      logger.error('Error deleting screenshot:', error)
      return false
    }

    logger.debug(`Screenshot deleted successfully: ${fileName}`)
    return true
  } catch (error) {
    logger.error('Error in deleteScreenshot:', error)
    return false
  }
}

// Get a signed URL for a screenshot (for private buckets)
export async function getSignedUrl(fileName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(`screenshots/${fileName}`, 60 * 60) // 1 hour expiry

    if (error || !data) {
      logger.error('Error getting signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    logger.error('Error in getSignedUrl:', error)
    return null
  }
}

// Database functions

// Convert a Tab object to a TabRecord for database
function tabToRecord(tab: Tab, userId: string): Omit<TabRecord, 'created_at' | 'updated_at'> {
  // Ensure the status is one of the allowed values
  let status: 'unprocessed' | 'kept' | 'discarded' = 'unprocessed';
  if (tab.status === 'kept' || tab.status === 'discarded') {
    status = tab.status;
  }

  // Make sure we have a valid date format (YYYY-MM-DD)
  let dateAdded = tab.dateAdded;
  if (!dateAdded || !/^\d{4}-\d{2}-\d{2}/.test(dateAdded)) {
    dateAdded = new Date().toISOString().split('T')[0];
  }

  // Ensure title is not empty
  const title = tab.title || 'Untitled';

  // Ensure URL is valid
  const url = tab.url || 'https://example.com';

  return {
    id: tab.id,
    user_id: userId,
    folder_id: tab.folderId,
    title: title.substring(0, 255), // Ensure title isn't too long
    url: url.substring(0, 2048), // Ensure URL isn't too long
    domain: tab.domain || '',
    date_added: dateAdded,
    summary: tab.summary || '',
    category: tab.category || 'uncategorized',
    screenshot_url: tab.screenshot || undefined,
    status: status
  }
}

// Convert a TabRecord to a Tab object
function recordToTab(record: TabRecord, tags: string[] = [], suggestedFolders: string[] = []): Tab {
  return {
    id: record.id,
    title: record.title,
    url: record.url,
    domain: record.domain,
    dateAdded: record.date_added,
    summary: record.summary || '',
    category: record.category || 'uncategorized',
    screenshot: record.screenshot_url,
    status: record.status,
    tags: tags,
    folderId: record.folder_id,
    suggestedFolders: suggestedFolders
  }
}

// Convert a Folder object to a FolderRecord for database
function folderToRecord(folder: Folder, userId: string): Omit<FolderRecord, 'created_at' | 'updated_at'> {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name || 'Untitled Folder',
    color: folder.color || undefined,
    icon: folder.icon || undefined
  }
}

// Convert a FolderRecord to a Folder object
function recordToFolder(record: FolderRecord): Folder {
  return {
    id: record.id,
    name: record.name,
    color: record.color,
    icon: record.icon
  }
}

// Save a tab to the database
export async function saveTabToDatabase(tab: Tab, userId: string): Promise<string | null> {
  try {
    logger.debug(`Saving tab to database: ${tab.id}`)
    console.log('Tab data:', JSON.stringify(tab, null, 2))
    console.log('User ID:', userId)

    // Ensure user profile exists
    const profileExists = await ensureUserProfileExists(userId)
    if (!profileExists) {
      throw new Error('Could not ensure user profile exists. Cannot save tab.')
    }

    const tabRecord = tabToRecord(tab, userId)
    console.log('Tab record for database:', JSON.stringify(tabRecord, null, 2))

    // Insert or update the tab
    const { data, error } = await supabase
      .from('tabs')
      .upsert(tabRecord)
      .select()

    if (error) {
      logger.error('Error saving tab to database:', error)
      console.error('Supabase error details:', error)
      throw new Error(`Failed to save tab: ${error.message}`)
    }

    console.log('Supabase response:', data)

    // Save tags
    if (tab.tags && tab.tags.length > 0) {
      try {
        console.log(`Saving ${tab.tags.length} tags for tab ${tab.id}`)
        await saveTabTags(tab.id, tab.tags, userId)
      } catch (tagError) {
        console.error('Error saving tags:', tagError)
        // Continue even if tag saving fails
      }
    }

    // Save suggested folders
    if (tab.suggestedFolders && tab.suggestedFolders.length > 0) {
      try {
        console.log(`Saving ${tab.suggestedFolders.length} suggested folders for tab ${tab.id}`)
        await saveSuggestedFolders(tab.id, tab.suggestedFolders)
      } catch (folderError) {
        console.error('Error saving suggested folders:', folderError)
        // Continue even if folder saving fails
      }
    }

    // Generate and save embedding
    try {
      console.log(`Generating embedding for tab ${tab.id}`)
      const embedding = await generateTabEmbedding(tab)
      
      if (embedding) {
        const { error: embeddingError } = await supabase
          .from('tabs')
          .update({ embedding })
          .eq('id', tab.id)
          .eq('user_id', userId)
          
        if (embeddingError) {
          console.error('Error saving embedding:', embeddingError)
        } else {
          console.log(`Embedding saved for tab ${tab.id}`)
        }
      }
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError)
      // Continue even if embedding generation fails
    }

    logger.debug(`Tab saved successfully: ${tab.id}`)
    return tab.id
  } catch (error) {
    logger.error('Error in saveTabToDatabase:', error)
    console.error('Exception details:', error)
    throw error // Re-throw to see the full error in the UI
  }
}

// Save tags for a tab
async function saveTabTags(tabId: string, tagNames: string[], userId: string): Promise<void> {
  try {
    // First, ensure all tags exist
    const tagPromises = tagNames.map(async (tagName) => {
      // Check if tag exists
      const { data: existingTags } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', userId)
        .eq('name', tagName)
        .limit(1)

      if (existingTags && existingTags.length > 0) {
        return existingTags[0].id
      }

      // Create new tag
      const { data: newTag, error } = await supabase
        .from('tags')
        .insert({ user_id: userId, name: tagName })
        .select()

      if (error || !newTag) {
        logger.error(`Error creating tag ${tagName}:`, error)
        return null
      }

      return newTag[0].id
    })

    const tagIds = (await Promise.all(tagPromises)).filter(Boolean) as string[]

    // Delete existing tab_tags
    await supabase
      .from('tab_tags')
      .delete()
      .eq('tab_id', tabId)

    // Insert new tab_tags
    if (tagIds.length > 0) {
      const tabTags = tagIds.map(tagId => ({ tab_id: tabId, tag_id: tagId }))

      const { error } = await supabase
        .from('tab_tags')
        .insert(tabTags)

      if (error) {
        logger.error('Error saving tab tags:', error)
      }
    }
  } catch (error) {
    logger.error('Error in saveTabTags:', error)
  }
}

// Save suggested folders for a tab
async function saveSuggestedFolders(tabId: string, folderIds: string[]): Promise<void> {
  try {
    // Delete existing suggested_folders
    await supabase
      .from('suggested_folders')
      .delete()
      .eq('tab_id', tabId)

    // Insert new suggested_folders
    if (folderIds.length > 0) {
      const suggestedFolders = folderIds.map(folderId => ({ tab_id: tabId, folder_id: folderId }))

      const { error } = await supabase
        .from('suggested_folders')
        .insert(suggestedFolders)

      if (error) {
        logger.error('Error saving suggested folders:', error)
      }
    }
  } catch (error) {
    logger.error('Error in saveSuggestedFolders:', error)
  }
}

// Get all tabs for a user
export async function getUserTabs(userId: string): Promise<Tab[]> {
  try {
    logger.debug(`Getting tabs for user: ${userId}`)

    // Get tabs
    const { data: tabRecords, error } = await supabase
      .from('tabs')
      .select('*')
      .eq('user_id', userId)
      .order('date_added', { ascending: false })

    if (error) {
      logger.error('Error getting user tabs:', error)
      return []
    }

    // Get tab tags
    const { data: tabTagRecords, error: tabTagError } = await supabase
      .from('tab_tags')
      .select('tab_id, tags(name)')
      .in('tab_id', tabRecords.map(tab => tab.id))

    if (tabTagError) {
      logger.error('Error getting tab tags:', tabTagError)
    }

    // Get suggested folders
    const { data: suggestedFolderRecords, error: suggestedFolderError } = await supabase
      .from('suggested_folders')
      .select('tab_id, folder_id')
      .in('tab_id', tabRecords.map(tab => tab.id))

    if (suggestedFolderError) {
      logger.error('Error getting suggested folders:', suggestedFolderError)
    }

    // Convert to Tab objects
    const tabs = tabRecords.map(tabRecord => {
      // Get tags for this tab in a type-safe way
      const tabTags: string[] = [];
      
      // Process tags safely
      if (tabTagRecords) {
        tabTagRecords.filter(tt => tt.tab_id === tabRecord.id).forEach(tt => {
          try {
            // Access as any to bypass TypeScript checking
            const tagsObj = tt.tags as any;
            
            if (tagsObj && typeof tagsObj === 'object' && tagsObj.name) {
              tabTags.push(String(tagsObj.name));
            }
          } catch (e) {
            console.error('Error processing tag record:', e);
          }
        });
      }

      // Get suggested folders for this tab
      const suggestedFolders = suggestedFolderRecords
        ?.filter(sf => sf.tab_id === tabRecord.id)
        .map(sf => sf.folder_id) || []

      return recordToTab(tabRecord, tabTags, suggestedFolders)
    })

    logger.debug(`Retrieved ${tabs.length} tabs for user ${userId}`)
    return tabs
  } catch (error) {
    logger.error('Error in getUserTabs:', error)
    return []
  }
}

// Delete a tab
export async function deleteTab(tabId: string): Promise<boolean> {
  try {
    logger.debug(`Deleting tab: ${tabId}`)

    // Get the tab to check for screenshot
    const { data: tab, error: getError } = await supabase
      .from('tabs')
      .select('screenshot_url')
      .eq('id', tabId)
      .single()

    if (getError) {
      logger.error('Error getting tab for deletion:', getError)
    } else if (tab?.screenshot_url) {
      // Extract filename from URL
      const url = new URL(tab.screenshot_url)
      const pathname = url.pathname
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1)

      // Delete the screenshot
      await deleteScreenshot(filename)
    }

    // Delete the tab
    const { error } = await supabase
      .from('tabs')
      .delete()
      .eq('id', tabId)

    if (error) {
      logger.error('Error deleting tab:', error)
      return false
    }

    logger.debug(`Tab deleted successfully: ${tabId}`)
    return true
  } catch (error) {
    logger.error('Error in deleteTab:', error)
    return false
  }
}

// Save a folder to the database
export async function saveFolderToDatabase(folder: Folder, userId: string): Promise<string | null> {
  try {
    logger.debug(`Saving folder to database: ${folder.id}`)
    console.log('Folder data:', JSON.stringify(folder, null, 2))
    console.log('User ID:', userId)

    // Ensure user profile exists
    const profileExists = await ensureUserProfileExists(userId)
    if (!profileExists) {
      throw new Error('Could not ensure user profile exists. Cannot save folder.')
    }

    const folderRecord = folderToRecord(folder, userId)
    console.log('Folder record for database:', JSON.stringify(folderRecord, null, 2))

    // Insert or update the folder
    const { data, error } = await supabase
      .from('folders')
      .upsert(folderRecord)
      .select()

    if (error) {
      logger.error('Error saving folder to database:', error)
      console.error('Supabase error details:', error)
      throw new Error(`Failed to save folder: ${error.message}`)
    }

    console.log('Supabase response:', data)

    logger.debug(`Folder saved successfully: ${folder.id}`)
    return folder.id
  } catch (error) {
    logger.error('Error in saveFolderToDatabase:', error)
    console.error('Exception details:', error)
    throw error // Re-throw to see the full error in the UI
  }
}

// Get all folders for a user
export async function getUserFolders(userId: string): Promise<Folder[]> {
  try {
    logger.debug(`Getting folders for user: ${userId}`)

    const { data: folderRecords, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) {
      logger.error('Error getting user folders:', error)
      return []
    }

    const folders = folderRecords.map(recordToFolder)

    logger.debug(`Retrieved ${folders.length} folders for user ${userId}`)
    return folders
  } catch (error) {
    logger.error('Error in getUserFolders:', error)
    return []
  }
}

// Delete a folder
export async function deleteFolder(folderId: string): Promise<boolean> {
  try {
    logger.debug(`Deleting folder: ${folderId}`)

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (error) {
      logger.error('Error deleting folder:', error)
      return false
    }

    logger.debug(`Folder deleted successfully: ${folderId}`)
    return true
  } catch (error) {
    logger.error('Error in deleteFolder:', error)
    return false
  }
}