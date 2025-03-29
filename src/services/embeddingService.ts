import { logger } from '@/utils/logger'
import { supabase } from '@/utils/supabase'
import { Tab } from '@/types/Tab'

/**
 * Generate an embedding for text using GTE-Small model (native to Supabase)
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!text || text.trim() === '') {
      logger.warn('Empty text provided for embedding generation')
      return null
    }

    // Truncate text if it's too long
    const truncatedText = text.substring(0, 8000)
    
    // Try to use Supabase's native GTE-Small model for embeddings
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { text: truncatedText }
      })
      
      if (error) {
        throw new Error(`Supabase function error: ${error.message}`)
      }
      
      if (data && data.embedding) {
        logger.debug('Successfully generated embedding using Supabase GTE-Small')
        return data.embedding
      }
    } catch (supabaseError) {
      logger.warn('Failed to generate embedding with Supabase:', supabaseError)
      // Fall back to OpenAI if available
    }
    
    // Fallback to OpenAI if Supabase function failed
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not found for fallback embedding generation')
      // Return a mock embedding for development without API key
      return Array(384).fill(0).map(() => Math.random() - 0.5)
    }

    logger.debug('Falling back to OpenAI for embedding generation')
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedText,
        dimensions: 384
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    logger.error('Error generating embedding:', error)
    return null
  }
}

/**
 * Generate embedding for a tab based on its content
 */
export async function generateTabEmbedding(tab: Tab): Promise<number[] | null> {
  try {
    // Combine relevant tab fields for embedding
    const textToEmbed = [
      tab.title || '',
      tab.summary || '',
      tab.category || '',
      tab.tags?.join(' ') || ''
    ].filter(Boolean).join(' \n ')

    if (!textToEmbed || textToEmbed.trim() === '') {
      logger.warn(`Tab ${tab.id} has no content for embedding`)
      return null
    }

    logger.debug(`Generating embedding for tab ${tab.id}`)
    return await generateEmbedding(textToEmbed)
  } catch (error) {
    logger.error(`Error generating embedding for tab ${tab.id}:`, error)
    return null
  }
}

/**
 * Update embeddings for a tab in the database
 */
export async function updateTabEmbedding(tabId: string, userId: string): Promise<boolean> {
  try {
    // Get tab data
    const { data: tab, error: getError } = await supabase
      .from('tabs')
      .select('*')
      .eq('id', tabId)
      .eq('user_id', userId)
      .single()

    if (getError || !tab) {
      logger.error(`Error getting tab ${tabId} for embedding:`, getError)
      return false
    }

    // Convert to Tab type
    const tabData: Tab = {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      domain: tab.domain,
      dateAdded: tab.date_added,
      summary: tab.summary || '',
      category: tab.category || 'uncategorized',
      screenshot: tab.screenshot_url,
      status: tab.status,
      tags: [],
      folderId: tab.folder_id,
      suggestedFolders: []
    }

    // Get tags for the tab
    const { data: tabTags, error: tagError } = await supabase
      .from('tab_tags')
      .select('tags(name)')
      .eq('tab_id', tabId)

    if (!tagError && tabTags) {
      // Process tags
      const tags: string[] = []
      for (const tagRecord of tabTags) {
        try {
          // Access as any to bypass TypeScript checking
          const tagsObj = tagRecord.tags as any
          
          if (tagsObj && typeof tagsObj === 'object' && tagsObj.name) {
            tags.push(String(tagsObj.name))
          }
        } catch (e) {
          console.error('Error processing tag record:', e)
        }
      }
      tabData.tags = tags
    }

    // Generate embedding
    const embedding = await generateTabEmbedding(tabData)
    
    if (!embedding) {
      logger.warn(`Failed to generate embedding for tab ${tabId}`)
      return false
    }

    // Update the tab with the embedding
    const { error: updateError } = await supabase
      .from('tabs')
      .update({ embedding })
      .eq('id', tabId)
      .eq('user_id', userId)

    if (updateError) {
      logger.error(`Error updating embedding for tab ${tabId}:`, updateError)
      return false
    }

    logger.debug(`Successfully updated embedding for tab ${tabId}`)
    return true
  } catch (error) {
    logger.error(`Error in updateTabEmbedding for tab ${tabId}:`, error)
    return false
  }
}

/**
 * Process tabs without embeddings
 */
export async function processTabsWithoutEmbeddings(userId: string, limit = 10): Promise<number> {
  try {
    // Find tabs without embeddings
    const { data: tabs, error } = await supabase
      .from('tabs')
      .select('id')
      .eq('user_id', userId)
      .is('embedding', null)
      .limit(limit)

    if (error) {
      logger.error('Error finding tabs without embeddings:', error)
      return 0
    }

    if (!tabs || tabs.length === 0) {
      logger.debug('No tabs without embeddings found')
      return 0
    }

    logger.info(`Processing embeddings for ${tabs.length} tabs`)
    
    // Process each tab
    const results = await Promise.all(
      tabs.map(tab => updateTabEmbedding(tab.id, userId))
    )

    // Count successful updates
    const successCount = results.filter(result => result).length
    logger.info(`Successfully updated embeddings for ${successCount}/${tabs.length} tabs`)
    
    return successCount
  } catch (error) {
    logger.error('Error in processTabsWithoutEmbeddings:', error)
    return 0
  }
}

/**
 * Search tabs using hybrid search (combines keyword and semantic search)
 */
export async function searchTabs(
  query: string,
  userId: string,
  options: {
    limit?: number,
    fullTextWeight?: number,
    semanticWeight?: number
  } = {}
): Promise<Tab[]> {
  try {
    if (!query || query.trim() === '') {
      logger.warn('Empty query provided for search')
      return []
    }

    // Try to generate embedding for the query (for semantic search)
    let embedding = null
    try {
      embedding = await generateEmbedding(query)
    } catch (embeddingError) {
      logger.error('Error generating embedding:', embeddingError)
      // Continue with keyword search only
    }
    
    // If no embedding was generated, fall back to text search only
    if (!embedding) {
      logger.info('No embedding available, falling back to keyword search')
      // Perform text search
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'discarded')
        .textSearch(
          'title, summary, category',
          query,
          { config: 'english' }
        )
        .limit(options.limit || 20)

      if (error) {
        logger.error('Error performing text search:', error)
        return []
      }

      return data || []
    }

    // Try hybrid search first
    try {
      // Perform hybrid search using the RPC function
      const { data, error } = await supabase.rpc('hybrid_search', {
        query_text: query,
        query_embedding: embedding,
        match_count: options.limit || 20,
        user_id: userId,
        full_text_weight: options.fullTextWeight || 1.0,
        semantic_weight: options.semanticWeight || 1.0
      })

      if (error) {
        // Hybrid search failed, fallback to standard text search
        logger.error('Error performing hybrid search, falling back to text search:', error)
        throw new Error('Hybrid search failed')
      }
      
      if (data) {
        return await enhanceTabsWithRelations(data, supabase)
      }
      
      return []
    } catch (hybridSearchError) {
      // Fallback to text search if hybrid search fails
      logger.info('Hybrid search failed, falling back to keyword search')
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'discarded')
        .textSearch(
          'title, summary, category',
          query,
          { config: 'english' }
        )
        .limit(options.limit || 20)

      if (error) {
        logger.error('Error performing fallback text search:', error)
        return []
      }
      
      return await enhanceTabsWithRelations(data || [], supabase)
    }

  } catch (error) {
    logger.error('Error in searchTabs:', error)
    return []
  }
}

/**
 * Helper function to enhance tab records with related data (tags and suggested folders)
 */
async function enhanceTabsWithRelations(tabRecords: any[], supabase: any): Promise<Tab[]> {
  if (!tabRecords || tabRecords.length === 0) {
    return []
  }
  
  try {
    const tabIds = tabRecords.map(tab => tab.id)
    
    // Get tab tags in parallel
    const [tagResponse, folderResponse] = await Promise.all([
      supabase
        .from('tab_tags')
        .select('tab_id, tags(name)')
        .in('tab_id', tabIds),
      
      supabase
        .from('suggested_folders')
        .select('tab_id, folder_id')
        .in('tab_id', tabIds)
    ])
    
    const tabTagRecords = tagResponse.data
    const suggestedFolderRecords = folderResponse.data
    
    // Enhance results with tags and suggested folders
    return tabRecords.map(tabRecord => {
      // Process tags
      const tabTags: string[] = []
      if (tabTagRecords) {
        tabTagRecords.filter(tt => tt.tab_id === tabRecord.id).forEach(tt => {
          try {
            const tagsObj = tt.tags as any
            if (tagsObj && typeof tagsObj === 'object' && tagsObj.name) {
              tabTags.push(String(tagsObj.name))
            }
          } catch (e) {
            console.error('Error processing tag record:', e)
          }
        })
      }

      // Process suggested folders
      const suggestedFolders = suggestedFolderRecords
        ?.filter(sf => sf.tab_id === tabRecord.id)
        .map(sf => sf.folder_id) || []

      // Return tab with complete data
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
      } as Tab
    })
  } catch (error) {
    logger.error('Error enhancing tabs with relations:', error)
    return tabRecords.map(tr => ({
      id: tr.id,
      title: tr.title,
      url: tr.url,
      domain: tr.domain,
      dateAdded: tr.date_added,
      summary: tr.summary || '',
      category: tr.category || 'uncategorized',
      screenshot: tr.screenshot_url,
      status: tr.status,
      tags: [],
      folderId: tr.folder_id,
      suggestedFolders: []
    } as Tab))
  }
}