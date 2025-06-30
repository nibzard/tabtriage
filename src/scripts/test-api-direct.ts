import { config } from 'dotenv';
import { hybridSearch } from '@/services/jinaEmbeddingService';
import { logger } from '@/utils/logger';

// Load environment variables from .env.local
config({ path: '.env.local' });

const TEST_USER_ID = 'test-user-001';

async function testAPISearchDirect() {
  logger.info('Testing search API directly...');
  
  try {
    const result = await hybridSearch('payment', TEST_USER_ID, { limit: 3 });
    
    logger.info(`Search results: ${result.length}`);
    result.forEach((item, i) => {
      logger.info(`${i+1}. ${item.title} (score: ${item.score?.toFixed(4)})`);
    });
    
    // Test the transformation logic that the API uses
    const transformedResults = result.map(tab => {
      return {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        domain: tab.domain || '',
        dateAdded: tab.date_added || tab.dateAdded || new Date().toISOString(),
        summary: tab.summary || '',
        category: tab.category || 'uncategorized',
        screenshot: tab.screenshot_url || tab.screenshotUrl,
        status: tab.status || 'unprocessed',
        tags: [], // Empty for now since we don't have tags
        folderId: tab.folder_id || tab.folderId,
        suggestedFolders: [],
        score: tab.score
      };
    });
    
    logger.info('\nTransformed results:');
    logger.info(JSON.stringify(transformedResults, null, 2));
    
  } catch (error) {
    logger.error('Direct search failed:', error);
  }
}

async function main() {
  await testAPISearchDirect();
}

main().catch(console.error).finally(() => process.exit(0));