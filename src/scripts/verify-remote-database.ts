import { config } from 'dotenv';
import { client } from '@/db/client';
import { logger } from '@/utils/logger';

// Load environment variables from .env.local
config({ path: '.env.local' });

const TEST_USER_ID = 'test-user-001';

async function verifyRemoteDatabase() {
  logger.info('Verifying remote database state...');
  
  try {
    // Check database URL
    const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
    logger.info(`Database URL: ${dbUrl}`);
    
    // Check user
    const userResult = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [TEST_USER_ID]
    });
    logger.info(`User exists: ${userResult.rows.length > 0}`);
    if (userResult.rows.length > 0) {
      logger.info(`User data:`, userResult.rows[0]);
    }
    
    // Check tabs
    const tabsResult = await client.execute({
      sql: 'SELECT id, title, user_id, embedding IS NOT NULL as has_embedding FROM tabs WHERE user_id = ?',
      args: [TEST_USER_ID]
    });
    logger.info(`User tabs count: ${tabsResult.rows.length}`);
    
    if (tabsResult.rows.length > 0) {
      logger.info('User tabs:');
      tabsResult.rows.forEach((tab, i) => {
        logger.info(`  ${i + 1}. ${(tab as any).title} (ID: ${(tab as any).id}, has embedding: ${(tab as any).has_embedding})`);
      });
    }
    
    // Check total tabs
    const totalTabsResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM tabs'
    });
    logger.info(`Total tabs in database: ${(totalTabsResult.rows[0] as any).count}`);
    
    // Test the ensure user function
    logger.info('Testing ensureUserExists function...');
    const { ensureUserExists } = await import('@/utils/ensure-user');
    await ensureUserExists(TEST_USER_ID);
    logger.info('ensureUserExists completed successfully');
    
  } catch (error) {
    logger.error('Error verifying database:', error);
    throw error;
  }
}

async function main() {
  await verifyRemoteDatabase();
}

main().catch(console.error).finally(() => process.exit(0));