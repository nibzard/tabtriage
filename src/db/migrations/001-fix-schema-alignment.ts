import { client } from '../client';
import { logger } from '@/utils/logger';

/**
 * Migration 001: Fix Schema Alignment
 * 
 * This migration addresses critical schema inconsistencies:
 * 1. Proper F32_BLOB(1024) type for embeddings
 * 2. Consistent column naming throughout
 * 3. Clean FTS5 implementation
 * 4. Proper foreign key relationships
 */

export async function up() {
  logger.info('Running migration 001: Fix Schema Alignment');
  
  try {
    // Drop corrupted FTS tables and triggers first
    await dropFTSInfrastructure();
    
    // Drop and recreate all tables with proper schema
    await dropAllTables();
    await createAllTables();
    
    // Create fresh FTS infrastructure
    await createFTSInfrastructure();
    
    logger.info('Migration 001 completed successfully');
  } catch (error) {
    logger.error('Migration 001 failed:', error);
    throw error;
  }
}

export async function down() {
  logger.info('Rolling back migration 001');
  
  try {
    await dropFTSInfrastructure();
    await dropAllTables();
    logger.info('Migration 001 rollback completed');
  } catch (error) {
    logger.error('Migration 001 rollback failed:', error);
    throw error;
  }
}

async function dropFTSInfrastructure() {
  logger.info('Dropping FTS infrastructure...');
  
  // Drop triggers
  await client.execute('DROP TRIGGER IF EXISTS tabs_fts_insert');
  await client.execute('DROP TRIGGER IF EXISTS tabs_fts_update');
  await client.execute('DROP TRIGGER IF EXISTS tabs_fts_delete');
  
  // Drop FTS table
  await client.execute('DROP TABLE IF EXISTS tabs_fts');
  
  logger.info('FTS infrastructure dropped');
}

async function dropAllTables() {
  logger.info('Dropping all tables...');
  
  const tables = [
    'suggested_folders',
    'tab_tags', 
    'tabs',
    'tags',
    'folders',
    'sessions',
    'accounts', 
    'verificationTokens',
    'users'
  ];
  
  for (const table of tables) {
    await client.execute(`DROP TABLE IF EXISTS ${table}`);
  }
  
  // Drop any vector indexes
  await client.execute('DROP TABLE IF EXISTS tabs_embedding_idx_shadow');
  await client.execute('DROP TABLE IF EXISTS libsql_vector_meta_shadow');
  
  logger.info('All tables dropped');
}

async function createAllTables() {
  logger.info('Creating all tables with proper schema...');
  
  // Users table - simplified for our needs
  await client.execute(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Folders table
  await client.execute(`
    CREATE TABLE folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tabs table - with proper F32_BLOB embedding type
  await client.execute(`
    CREATE TABLE tabs (
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
  
  // Tags table
  await client.execute(`
    CREATE TABLE tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name)
    )
  `);
  
  // Tab tags junction table
  await client.execute(`
    CREATE TABLE tab_tags (
      tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (tab_id, tag_id)
    )
  `);
  
  // Suggested folders table
  await client.execute(`
    CREATE TABLE suggested_folders (
      id TEXT PRIMARY KEY,
      tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
      folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      confidence REAL NOT NULL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tab_id, folder_id)
    )
  `);
  
  // Create indexes for performance
  await createIndexes();
  
  logger.info('All tables created successfully');
}

async function createIndexes() {
  logger.info('Creating database indexes...');
  
  // Tab indexes
  await client.execute('CREATE INDEX idx_tabs_user_id ON tabs(user_id)');
  await client.execute('CREATE INDEX idx_tabs_folder_id ON tabs(folder_id)');
  await client.execute('CREATE INDEX idx_tabs_status ON tabs(status)');
  await client.execute('CREATE INDEX idx_tabs_category ON tabs(category)');
  await client.execute('CREATE INDEX idx_tabs_date_added ON tabs(date_added)');
  await client.execute('CREATE INDEX idx_tabs_domain ON tabs(domain)');
  
  // Tag indexes
  await client.execute('CREATE INDEX idx_tags_user_id ON tags(user_id)');
  await client.execute('CREATE INDEX idx_tab_tags_tab_id ON tab_tags(tab_id)');
  await client.execute('CREATE INDEX idx_tab_tags_tag_id ON tab_tags(tag_id)');
  
  // Folder indexes
  await client.execute('CREATE INDEX idx_folders_user_id ON folders(user_id)');
  await client.execute('CREATE INDEX idx_suggested_folders_tab_id ON suggested_folders(tab_id)');
  
  logger.info('Database indexes created');
}

async function createFTSInfrastructure() {
  logger.info('Creating FTS infrastructure...');
  
  // Create FTS5 virtual table with proper tokenization
  await client.execute(`
    CREATE VIRTUAL TABLE tabs_fts USING fts5(
      id UNINDEXED,
      title,
      url,
      domain, 
      summary,
      category,
      content='tabs',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    )
  `);
  
  // Create triggers to keep FTS in sync
  await client.execute(`
    CREATE TRIGGER tabs_fts_insert AFTER INSERT ON tabs
    BEGIN
      INSERT INTO tabs_fts(id, title, url, domain, summary, category)
      VALUES (new.id, new.title, new.url, new.domain, new.summary, new.category);
    END
  `);
  
  await client.execute(`
    CREATE TRIGGER tabs_fts_update AFTER UPDATE ON tabs
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
    CREATE TRIGGER tabs_fts_delete AFTER DELETE ON tabs
    BEGIN
      DELETE FROM tabs_fts WHERE id = old.id;
    END
  `);
  
  logger.info('FTS infrastructure created successfully');
}

// Utility function to run this migration
export async function runMigration(direction: 'up' | 'down' = 'up') {
  if (direction === 'up') {
    await up();
  } else {
    await down();
  }
}