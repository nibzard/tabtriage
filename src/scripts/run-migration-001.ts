import { runMigration } from '../db/migrations/001-fix-schema-alignment';
import { logger } from '@/utils/logger';
import { ensureUserExists } from '@/utils/ensure-user';
import { client, generateId } from '@/db/client';

const TEST_USER_ID = 'test-user-001';

const TEST_LINKS = [
  { url: 'https://stripe.com/', title: 'Stripe | Payment Processing Platform', domain: 'stripe.com', summary: 'Online payment processing for internet businesses', category: 'finance' },
  { url: 'https://airbnb.com/', title: 'Airbnb | Vacation Rentals', domain: 'airbnb.com', summary: 'Book unique homes and experiences all over the world', category: 'travel' },
  { url: 'https://coinbase.com/', title: 'Coinbase | Cryptocurrency Exchange', domain: 'coinbase.com', summary: 'Buy, sell, and manage cryptocurrency', category: 'finance' },
  { url: 'https://doordash.com/', title: 'DoorDash | Food Delivery', domain: 'doordash.com', summary: 'Restaurant delivery service', category: 'food' },
  { url: 'https://instacart.com/', title: 'Instacart | Grocery Delivery', domain: 'instacart.com', summary: 'Grocery delivery and pickup service', category: 'shopping' },
  { url: 'https://dropbox.com/', title: 'Dropbox | Cloud Storage', domain: 'dropbox.com', summary: 'Cloud storage and file synchronization service', category: 'productivity' },
  { url: 'https://cruise.com/', title: 'Cruise | Self-Driving Cars', domain: 'cruise.com', summary: 'Autonomous vehicle technology company', category: 'technology' },
  { url: 'https://gitlab.com/', title: 'GitLab | DevOps Platform', domain: 'gitlab.com', summary: 'Complete DevOps platform for software development', category: 'development' },
  { url: 'https://reddit.com/', title: 'Reddit | Social News', domain: 'reddit.com', summary: 'Social news aggregation and discussion', category: 'social' },
  { url: 'https://brex.com/', title: 'Brex | Corporate Cards', domain: 'brex.com', summary: 'Financial services for startups and enterprises', category: 'finance' }
];

async function importTestData() {
  logger.info(`Importing ${TEST_LINKS.length} test links...`);
  
  try {
    // Create test user
    await ensureUserExists(TEST_USER_ID);
    
    // Create a test folder
    const folderId = generateId();
    await client.execute({
      sql: 'INSERT INTO folders (id, user_id, name, color, icon) VALUES (?, ?, ?, ?, ?)',
      args: [folderId, TEST_USER_ID, 'Tech Companies', '#4F46E5', '🚀']
    });
    
    // Import tabs
    for (const link of TEST_LINKS) {
      const tabId = generateId();
      await client.execute({
        sql: `INSERT INTO tabs (id, user_id, folder_id, title, url, domain, summary, category, status) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          tabId,
          TEST_USER_ID,
          folderId,
          link.title,
          link.url,
          link.domain,
          link.summary,
          link.category,
          'kept'
        ]
      });
      logger.info(`Imported: ${link.title}`);
    }
    
    logger.info('Test data imported successfully');
  } catch (error) {
    logger.error('Error importing test data:', error);
    throw error;
  }
}

async function verifyMigration() {
  logger.info('Verifying migration results...');
  
  try {
    // Check tabs count
    const tabCount = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM tabs WHERE user_id = ?',
      args: [TEST_USER_ID]
    });
    logger.info(`Total tabs: ${tabCount.rows[0].count}`);
    
    // Check FTS count (should auto-populate via triggers)
    const ftsCount = await client.execute('SELECT COUNT(*) as count FROM tabs_fts');
    logger.info(`FTS entries: ${ftsCount.rows[0].count}`);
    
    // Test FTS search
    const searchTest = await client.execute({
      sql: `SELECT COUNT(*) as count FROM tabs_fts WHERE tabs_fts MATCH ?`,
      args: ['finance']
    });
    logger.info(`FTS search for "finance": ${searchTest.rows[0].count} results`);
    
    // Check table schema
    const schema = await client.execute(`PRAGMA table_info(tabs)`);
    logger.info('Tabs table schema:');
    schema.rows.forEach((col: any) => {
      logger.info(`  - ${col.name}: ${col.type}`);
    });
    
    // Verify embedding column type
    const embeddingCol = schema.rows.find((col: any) => col.name === 'embedding');
    if (embeddingCol?.type === 'F32_BLOB(1024)') {
      logger.info('✅ Embedding column has correct F32_BLOB(1024) type');
    } else {
      logger.warn(`⚠️ Embedding column type: ${embeddingCol?.type}`);
    }
    
  } catch (error) {
    logger.error('Error verifying migration:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const direction = args.includes('--down') ? 'down' : 'up';
  
  logger.info(`Running migration 001 (${direction})...`);
  
  try {
    if (direction === 'up') {
      // Run migration
      await runMigration('up');
      
      // Import test data
      await importTestData();
      
      // Verify results
      await verifyMigration();
      
      logger.info('✅ Migration 001 and data import completed successfully!');
      logger.info(`\nYou can now test with user ID: ${TEST_USER_ID}`);
      
    } else {
      // Rollback migration
      await runMigration('down');
      logger.info('✅ Migration 001 rolled back successfully!');
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error).finally(() => process.exit(0));