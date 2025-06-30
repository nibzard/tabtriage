import { config } from 'dotenv';
import { testJinaConnection, updateMissingEmbeddings, getEmbeddingStats } from '@/services/jinaEmbeddingService';
import { logger } from '@/utils/logger';

// Load environment variables from .env.local
config({ path: '.env.local' });

const TEST_USER_ID = 'test-user-001';

async function main() {
  logger.info('Testing Jina APIs and generating enhanced embeddings...');
  
  let enablePageContent = true; // Set to false to generate embeddings without page content
  
  try {
    // First, test the Embeddings API connection
    logger.info('Testing Jina Embeddings API connection...');
    const embeddingTest = await testJinaConnection();
    
    if (!embeddingTest.success) {
      logger.error('Jina Embeddings API connection failed:', embeddingTest.message);
      logger.error('Please check your JINA_API_KEY in .env.local');
      process.exit(1);
    }
    
    logger.info('✅ Jina Embeddings API connection successful:', embeddingTest.message);
    if (embeddingTest.testEmbedding) {
      logger.info('Sample embedding values:', embeddingTest.testEmbedding);
    }
    
    // Page content extraction is now always enabled with our HTML extractor
    logger.info('Page content extraction enabled using HTML content extractor');
    
    // Get initial embedding stats
    logger.info('Checking current embedding status...');
    const initialStats = await getEmbeddingStats(TEST_USER_ID);
    logger.info(`Initial stats: ${initialStats.withEmbeddings}/${initialStats.total} tabs have embeddings (${initialStats.percentage}%)`);
    
    if (initialStats.withoutEmbeddings > 0) {
      logger.info(`Generating enhanced embeddings for ${initialStats.withoutEmbeddings} tabs...`);
      logger.info('Enhanced embeddings will include page content extracted via HTML content extractor');
      
      // Generate embeddings in batches
      let totalUpdated = 0;
      let batchCount = 0;
      
      while (totalUpdated < initialStats.withoutEmbeddings) {
        batchCount++;
        logger.info(`Processing batch ${batchCount}...`);
        
        const updated = await updateMissingEmbeddings(TEST_USER_ID, 5, enablePageContent);
        totalUpdated += updated;
        
        if (updated === 0) {
          break; // No more tabs to update
        }
        
        // Longer delay between batches when using page content extraction
        const delayMs = enablePageContent ? 1000 : 500;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      logger.info(`✅ Generated ${enablePageContent ? 'enhanced' : 'basic'} embeddings for ${totalUpdated} tabs`);
    } else {
      logger.info('✅ All tabs already have embeddings');
    }
    
    // Get final stats
    const finalStats = await getEmbeddingStats(TEST_USER_ID);
    logger.info(`Final stats: ${finalStats.withEmbeddings}/${finalStats.total} tabs have embeddings (${finalStats.percentage}%)`);
    
    if (finalStats.percentage === 100) {
      logger.info(`🎉 All tabs now have ${enablePageContent ? 'enhanced' : 'basic'} embeddings! Vector search is ready.`);
    } else {
      logger.warn(`⚠️ ${finalStats.withoutEmbeddings} tabs still missing embeddings`);
    }
    
  } catch (error) {
    logger.error('Error generating embeddings:', error);
    process.exit(1);
  }
}

main().catch(console.error).finally(() => process.exit(0));