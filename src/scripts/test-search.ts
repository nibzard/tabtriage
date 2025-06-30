import { hybridSearch } from '@/services/jinaEmbeddingService';
import { logger } from '@/utils/logger';
import { client } from '@/db/client';

const TEST_USER_ID = 'test-user-001';

async function testSearchQueries() {
  const queries = [
    'finance',
    'payment',
    'cloud storage',
    'delivery',
    'gitlab',
    'reddit social',
    'stripe coinbase', // multi-term
    'autonomous vehicles'
  ];
  
  logger.info('Testing search queries...\n');
  
  for (const query of queries) {
    logger.info(`\nSearching for: "${query}"`);
    logger.info('-'.repeat(50));
    
    try {
      // Test hybrid search (will fallback to text-only since no embeddings)
      const results = await hybridSearch(query, TEST_USER_ID, {
        limit: 5,
        vectorWeight: 0.7,
        textWeight: 0.3
      });
      
      if (results.length === 0) {
        logger.warn('No results found');
      } else {
        results.forEach((result, index) => {
          logger.info(`${index + 1}. ${result.title}`);
          logger.info(`   URL: ${result.url}`);
          logger.info(`   Score: ${result.score?.toFixed(3) || 'N/A'}`);
          if (result.textRank) {
            logger.info(`   Text Rank: #${result.textRank}`);
          }
        });
      }
    } catch (error) {
      logger.error(`Search failed: ${error.message}`);
    }
  }
}

async function testDirectFTS() {
  logger.info('\n\nTesting direct FTS queries...\n');
  
  const ftsQueries = [
    'finance',
    'payment OR cryptocurrency',
    'cloud AND storage',
    '"food delivery"'
  ];
  
  for (const query of ftsQueries) {
    logger.info(`\nFTS Query: "${query}"`);
    logger.info('-'.repeat(50));
    
    try {
      const result = await client.execute({
        sql: `
          SELECT t.title, t.domain, bm25(tabs_fts) as score
          FROM tabs_fts 
          JOIN tabs t ON tabs_fts.id = t.id
          WHERE tabs_fts MATCH ?
          ORDER BY score
          LIMIT 5
        `,
        args: [query]
      });
      
      if (result.rows.length === 0) {
        logger.warn('No results found');
      } else {
        result.rows.forEach((row: any, index) => {
          logger.info(`${index + 1}. ${row.title} (${row.domain})`);
          logger.info(`   BM25 Score: ${row.score.toFixed(3)}`);
        });
      }
    } catch (error) {
      logger.error(`FTS query failed: ${error.message}`);
    }
  }
}

async function main() {
  try {
    // Test hybrid search
    await testSearchQueries();
    
    // Test direct FTS
    await testDirectFTS();
    
    logger.info('\n✅ Search tests completed!');
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error).finally(() => process.exit(0));