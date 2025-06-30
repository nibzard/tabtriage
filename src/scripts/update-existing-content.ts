import { config } from 'dotenv';
import { createClient } from '@libsql/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

const TEST_USER_ID = 'test-user-001';

async function updateExistingContent() {
  // Create simple client
  const client = createClient({
    url: process.env.DATABASE_MODE === 'turso' 
      ? process.env.TURSO_DATABASE_URL || 'file:local.db'
      : 'file:local.db',
    authToken: process.env.DATABASE_MODE === 'turso' 
      ? process.env.TURSO_AUTH_TOKEN 
      : undefined,
  });

  try {
    console.log('🔧 Starting content update for existing tabs...');

    // Get all tabs without content
    const result = await client.execute({
      sql: `SELECT id, title, summary, url FROM tabs WHERE user_id = ? AND (content IS NULL OR content = '')`,
      args: [TEST_USER_ID]
    });

    const tabsToUpdate = result.rows as any[];
    console.log(`📊 Found ${tabsToUpdate.length} tabs without content`);

    if (tabsToUpdate.length === 0) {
      console.log('✅ All tabs already have content');
      return;
    }

    let updatedCount = 0;
    let extractedCount = 0;

    for (const tab of tabsToUpdate) {
      try {
        console.log(`🔄 Processing: ${tab.title} (${tab.url})`);

        let finalContent = '';
        const title = tab.title || '';
        const summary = tab.summary || '';
        const url = tab.url || '';

        // For now, just use title + summary (page extraction would require complex setup)
        finalContent = generateEmbeddingText(title, summary, undefined, url);
        console.log(`  📝 Using title + summary: ${finalContent.length} chars`);
        
        // TODO: Add page content extraction in a future update
        if (url) {
          console.log(`  🔗 URL available for future extraction: ${url}`);
        }

        // Update the content column
        if (finalContent) {
          await client.execute({
            sql: `UPDATE tabs SET content = ? WHERE id = ?`,
            args: [finalContent, tab.id]
          });
          updatedCount++;
          console.log(`  ✅ Updated content (${finalContent.length} chars)`);
        }

        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`  ❌ Failed to update tab ${tab.id}:`, error);
      }
    }

    console.log('\n🎉 Content update completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Total tabs processed: ${tabsToUpdate.length}`);
    console.log(`  - Successfully updated: ${updatedCount}`);
    console.log(`  - All updated with title+summary content`);

  } catch (error) {
    console.error('💥 Error updating existing content:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Helper function to generate embedding text (copied from service to avoid import issues)
function generateEmbeddingText(title: string, summary: string, pageContent?: string, url?: string): string {
  const parts = [];
  
  // Add title if available
  if (title && title.trim()) {
    parts.push(title.trim());
  }
  
  // Add summary if available
  if (summary && summary.trim()) {
    parts.push(summary.trim());
  }
  
  // Add page content if available
  if (pageContent && pageContent.trim()) {
    parts.push(pageContent.trim());
  }
  
  // If we have no meaningful content yet, extract info from URL
  if (parts.length === 0 && url) {
    const urlInfo = extractInfoFromUrl(url);
    if (urlInfo) {
      parts.push(urlInfo);
    }
  }
  
  return parts.join(' ').trim();
}

// Extract meaningful information from URL
function extractInfoFromUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname;
    
    const parts = [];
    
    if (domain) {
      const domainWords = domain.split('.')[0];
      const readableDomain = domainWords.charAt(0).toUpperCase() + domainWords.slice(1);
      parts.push(`${readableDomain} website`);
    }
    
    if (path && path !== '/' && path.length > 1) {
      const pathParts = path.split('/').filter(part => part.length > 0);
      const readablePath = pathParts
        .map(part => part.replace(/[-_]/g, ' '))
        .join(' ')
        .toLowerCase();
      
      if (readablePath && readablePath.length > 2) {
        parts.push(`${readablePath} page`);
      }
    }
    
    return parts.join(' ');
  } catch (error) {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? `${match[1]} website` : '';
  }
}

// Run the update
updateExistingContent()
  .then(() => {
    console.log('🎯 All existing content updated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Content update failed:', error);
    process.exit(1);
  });