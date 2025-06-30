import { config } from 'dotenv';
import { hybridSearch, searchTabsByVector } from '@/services/jinaEmbeddingService';
import { client } from '@/db/client';
import { logger } from '@/utils/logger';

// Load environment variables from .env.local
config({ path: '.env.local' });

const TEST_USER_ID = 'test-user-001';

async function testVectorSearch() {
  logger.info('Testing vector search...');
  
  const queries = [
    'payment processing',
    'cloud storage', 
    'food delivery',
    'cryptocurrency',
    'social media'
  ];
  
  for (const query of queries) {
    try {
      const results = await searchTabsByVector(query, TEST_USER_ID, 3);
      logger.info(`\nVector search: "${query}"`);
      logger.info(`Results: ${results.length}`);
      
      results.forEach((result, i) => {
        logger.info(`  ${i+1}. ${result.title} (distance: ${result.distance?.toFixed(4)})`);
      });
    } catch (error) {
      logger.error(`Vector search failed for "${query}":`, error.message);
    }
  }
}

async function testFTSSearch() {
  logger.info('\nTesting FTS search...');
  
  const queries = [
    'payment',
    'delivery',
    'social',
    'platform',
    'cards'
  ];
  
  for (const query of queries) {
    try {
      const result = await client.execute({
        sql: `
          SELECT t.title, bm25(tabs_fts) as score
          FROM tabs_fts 
          JOIN tabs t ON tabs_fts.id = t.id
          WHERE tabs_fts MATCH ?
          ORDER BY score
          LIMIT 3
        `,
        args: [query]
      });
      
      logger.info(`\nFTS search: "${query}"`);
      logger.info(`Results: ${result.rows.length}`);
      
      result.rows.forEach((row: any, i) => {
        logger.info(`  ${i+1}. ${row.title} (BM25: ${row.score?.toFixed(4)})`);
      });
    } catch (error) {
      logger.error(`FTS search failed for "${query}":`, error.message);
    }
  }
}

async function testHybridSearch() {
  logger.info('\nTesting hybrid search...');
  
  const queries = [
    'finance payment',
    'cloud storage files',
    'food delivery service',
    'developer tools',
    'social network'
  ];
  
  for (const query of queries) {
    try {
      const results = await hybridSearch(query, TEST_USER_ID, {
        limit: 3,
        vectorWeight: 0.7,
        textWeight: 0.3
      });
      
      logger.info(`\nHybrid search: "${query}"`);
      logger.info(`Results: ${results.length}`);
      
      results.forEach((result, i) => {
        const score = result.score?.toFixed(4) || 'N/A';
        const vectorRank = result.vectorRank ? `V:${result.vectorRank}` : '';
        const textRank = result.textRank ? `T:${result.textRank}` : '';
        const ranks = [vectorRank, textRank].filter(Boolean).join(' ');
        
        logger.info(`  ${i+1}. ${result.title} (score: ${score} ${ranks})`);
      });
    } catch (error) {
      logger.error(`Hybrid search failed for "${query}":`, error.message);
    }
  }
}

async function testSearchComparison() {
  logger.info('\nTesting search comparison...');
  
  const testQuery = 'payment processing';
  
  try {
    // Vector only
    const vectorResults = await searchTabsByVector(testQuery, TEST_USER_ID, 5);
    
    // FTS only
    const ftsResults = await client.execute({
      sql: `
        SELECT t.title, bm25(tabs_fts) as score
        FROM tabs_fts 
        JOIN tabs t ON tabs_fts.id = t.id
        WHERE tabs_fts MATCH ? AND t.user_id = ?
        ORDER BY score
        LIMIT 5
      `,
      args: [testQuery, TEST_USER_ID]
    });
    
    // Hybrid
    const hybridResults = await hybridSearch(testQuery, TEST_USER_ID, { limit: 5 });
    
    logger.info(`\nComparison for "${testQuery}":`);
    logger.info(`Vector only: ${vectorResults.length} results`);
    logger.info(`FTS only: ${ftsResults.rows.length} results`);
    logger.info(`Hybrid: ${hybridResults.length} results`);
    
    logger.info('\nTop result comparison:');
    if (vectorResults[0]) logger.info(`Vector: ${vectorResults[0].title}`);
    if (ftsResults.rows[0]) logger.info(`FTS: ${(ftsResults.rows[0] as any).title}`);
    if (hybridResults[0]) logger.info(`Hybrid: ${hybridResults[0].title}`);
    
  } catch (error) {
    logger.error('Search comparison failed:', error);
  }
}

async function main() {
  logger.info('Running comprehensive search tests...\n');
  
  try {
    await testVectorSearch();
    await testFTSSearch();
    await testHybridSearch();
    await testSearchComparison();
    
    logger.info('\n✅ All search tests completed!');
    
  } catch (error) {
    logger.error('Search tests failed:', error);
    process.exit(1);
  }
}

main().catch(console.error).finally(() => process.exit(0));