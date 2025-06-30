import { client, db } from '@/db/client';
import { users, tabs, folders, tags, tabTags, suggestedFolders } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { logger } from '@/utils/logger';
import { ensureUserExists } from '@/utils/ensure-user';
import { generateId } from '@/db/client';

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

async function dropAllTables() {
  logger.info('Dropping all tables...');
  
  try {
    // Drop FTS triggers first
    await client.execute('DROP TRIGGER IF EXISTS tabs_fts_insert');
    await client.execute('DROP TRIGGER IF EXISTS tabs_fts_update');
    await client.execute('DROP TRIGGER IF EXISTS tabs_fts_delete');
    
    // Drop FTS table
    await client.execute('DROP TABLE IF EXISTS tabs_fts');
    
    // Drop regular tables in dependency order
    await client.execute('DROP TABLE IF EXISTS tab_tags');
    await client.execute('DROP TABLE IF EXISTS suggested_folders');
    await client.execute('DROP TABLE IF EXISTS tabs');
    await client.execute('DROP TABLE IF EXISTS tags');
    await client.execute('DROP TABLE IF EXISTS folders');
    await client.execute('DROP TABLE IF EXISTS verificationTokens');
    await client.execute('DROP TABLE IF EXISTS sessions');
    await client.execute('DROP TABLE IF EXISTS accounts');
    await client.execute('DROP TABLE IF EXISTS users');
    
    // Drop any vector indexes
    await client.execute('DROP TABLE IF EXISTS tabs_embedding_idx_shadow');
    await client.execute('DROP TABLE IF EXISTS libsql_vector_meta_shadow');
    
    logger.info('All tables dropped successfully');
  } catch (error) {
    logger.error('Error dropping tables:', error);
    throw error;
  }
}

async function createTables() {
  logger.info('Creating tables...');
  
  try {
    // Create users table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create folders table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create tabs table with embedding column
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tabs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        domain TEXT,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        summary TEXT,
        category TEXT DEFAULT 'uncategorized',
        thumbnail_url TEXT,
        screenshot_url TEXT,
        full_screenshot_url TEXT,
        status TEXT DEFAULT 'unprocessed' CHECK(status IN ('unprocessed', 'kept', 'discarded')),
        embedding F32_BLOB(1024),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create tags table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create tab_tags junction table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS tab_tags (
        tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (tab_id, tag_id)
      )
    `);
    
    // Create suggested_folders table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS suggested_folders (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
        folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
        confidence REAL NOT NULL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('All tables created successfully');
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  }
}

async function createFTSTable() {
  logger.info('Creating FTS table...');
  
  try {
    // Create FTS5 table
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS tabs_fts USING fts5(
        id UNINDEXED,
        title,
        url,
        domain,
        summary,
        category,
        content='tabs',
        content_rowid='id',
        tokenize='porter unicode61'
      )
    `);
    
    // Create triggers to keep FTS in sync
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tabs_fts_insert
      AFTER INSERT ON tabs
      BEGIN
        INSERT INTO tabs_fts (id, title, url, domain, summary, category)
        VALUES (new.id, new.title, new.url, new.domain, new.summary, new.category);
      END
    `);
    
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tabs_fts_update
      AFTER UPDATE ON tabs
      BEGIN
        UPDATE tabs_fts
        SET title = new.title,
            url = new.url,
            domain = new.domain,
            summary = new.summary,
            category = new.category
        WHERE id = new.id;
      END
    `);
    
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tabs_fts_delete
      AFTER DELETE ON tabs
      BEGIN
        DELETE FROM tabs_fts WHERE id = old.id;
      END
    `);
    
    logger.info('FTS table and triggers created successfully');
  } catch (error) {
    logger.error('Error creating FTS table:', error);
    throw error;
  }
}

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

async function verifyData() {
  logger.info('Verifying imported data...');
  
  try {
    // Check tabs count
    const tabCount = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM tabs WHERE user_id = ?',
      args: [TEST_USER_ID]
    });
    logger.info(`Total tabs: ${tabCount.rows[0].count}`);
    
    // Check FTS count
    const ftsCount = await client.execute('SELECT COUNT(*) as count FROM tabs_fts');
    logger.info(`FTS entries: ${ftsCount.rows[0].count}`);
    
    // Test FTS search
    const searchTest = await client.execute({
      sql: `SELECT COUNT(*) as count FROM tabs_fts WHERE tabs_fts MATCH ?`,
      args: ['finance']
    });
    logger.info(`FTS search for "finance": ${searchTest.rows[0].count} results`);
    
    // List all categories
    const categories = await client.execute({
      sql: 'SELECT DISTINCT category, COUNT(*) as count FROM tabs GROUP BY category',
      args: []
    });
    logger.info('Categories:');
    categories.rows.forEach(cat => {
      logger.info(`  - ${cat.category}: ${cat.count} tabs`);
    });
    
  } catch (error) {
    logger.error('Error verifying data:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes('--remote');
  
  if (isRemote && !process.env.TURSO_DATABASE_URL) {
    logger.error('TURSO_DATABASE_URL not set. Cannot reset remote database.');
    process.exit(1);
  }
  
  logger.info(`Resetting ${isRemote ? 'REMOTE (Turso)' : 'LOCAL'} database...`);
  
  if (isRemote) {
    const confirm = args.includes('--force');
    if (!confirm) {
      logger.warn('⚠️  WARNING: This will DELETE ALL DATA in your Turso database!');
      logger.warn('Run with --remote --force to confirm');
      process.exit(1);
    }
  }
  
  try {
    // Drop all tables
    await dropAllTables();
    
    // Create tables
    await createTables();
    
    // Create FTS
    await createFTSTable();
    
    // Import test data
    await importTestData();
    
    // Verify
    await verifyData();
    
    logger.info('✅ Database reset and test data import completed successfully!');
    logger.info(`\nYou can now test with user ID: ${TEST_USER_ID}`);
    
  } catch (error) {
    logger.error('Failed to reset database:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error).finally(() => process.exit(0));