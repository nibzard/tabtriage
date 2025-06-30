#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
dotenv.config({ path: '.env' });

/**
 * Database migration utility to sync local SQLite to Turso
 * 
 * This script:
 * 1. Connects to both local SQLite and Turso databases
 * 2. Drops and recreates all tables in Turso
 * 3. Exports all data from local database
 * 4. Imports all data to Turso database
 * 5. Validates the migration was successful
 */

interface MigrationStats {
  users: number;
  folders: number;
  tabs: number;
  tags: number;
  tabTags: number;
  suggestedFolders: number;
}

class DatabaseMigrator {
  private localClient: ReturnType<typeof createClient>;
  private tursoClient: ReturnType<typeof createClient>;
  private localDb: ReturnType<typeof drizzle>;
  private tursoDb: ReturnType<typeof drizzle>;

  constructor() {
    // Create local SQLite connection
    this.localClient = createClient({
      url: 'file:local.db',
    });
    this.localDb = drizzle(this.localClient, { schema });

    // Get Turso configuration
    const tursoConfig = this.getTursoConfig();
    this.tursoClient = createClient({
      url: tursoConfig.url,
      authToken: tursoConfig.authToken,
    });
    this.tursoDb = drizzle(this.tursoClient, { schema });
  }

  private getTursoConfig() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error(
        'TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set for migration.\n' +
        'Make sure your .env.local contains these values.'
      );
    }

    return { url, authToken };
  }

  async validateConnections() {
    console.log('🔍 Validating database connections...');
    
    try {
      await this.localClient.execute('SELECT 1');
      console.log('✅ Local SQLite connection successful');
    } catch (error) {
      throw new Error(`❌ Local SQLite connection failed: ${error}`);
    }

    try {
      await this.tursoClient.execute('SELECT 1');
      console.log('✅ Turso connection successful');
    } catch (error) {
      throw new Error(`❌ Turso connection failed: ${error}`);
    }
  }

  async dropAndRecreateTables() {
    console.log('🗑️  Dropping existing tables in Turso...');
    
    // Drop tables in reverse dependency order
    const dropQueries = [
      'DROP TABLE IF EXISTS suggested_folders',
      'DROP TABLE IF EXISTS tab_tags',
      'DROP TABLE IF EXISTS tags',
      'DROP TABLE IF EXISTS tabs',
      'DROP TABLE IF EXISTS folders',
      'DROP TABLE IF EXISTS users',
      // Drop FTS tables if they exist
      'DROP TABLE IF EXISTS tabs_fts',
      'DROP TRIGGER IF EXISTS tabs_fts_insert',
      'DROP TRIGGER IF EXISTS tabs_fts_delete',
      'DROP TRIGGER IF EXISTS tabs_fts_update',
    ];

    for (const query of dropQueries) {
      try {
        await this.tursoClient.execute(query);
      } catch (error) {
        // Ignore errors for non-existent tables/triggers
        console.log(`⚠️  ${query}: ${error}`);
      }
    }

    console.log('🏗️  Creating tables in Turso...');
    
    // Create tables with proper schema
    const createQueries = [
      `CREATE TABLE users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE tabs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        domain TEXT,
        date_added TEXT DEFAULT CURRENT_TIMESTAMP,
        summary TEXT,
        category TEXT DEFAULT 'uncategorized',
        thumbnail_url TEXT,
        screenshot_url TEXT,
        full_screenshot_url TEXT,
        status TEXT DEFAULT 'unprocessed',
        embedding F32_BLOB(1024),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE tab_tags (
        tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (tab_id, tag_id)
      )`,
      
      `CREATE TABLE suggested_folders (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
        folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
        confidence REAL NOT NULL DEFAULT 0.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of createQueries) {
      await this.tursoClient.execute(query);
    }

    // Create FTS table for search functionality
    await this.tursoClient.execute(`
      CREATE VIRTUAL TABLE tabs_fts USING fts5(
        title, summary, url, domain, category,
        content='tabs', content_rowid='rowid'
      )
    `);

    // Create FTS triggers
    await this.tursoClient.execute(`
      CREATE TRIGGER tabs_fts_insert AFTER INSERT ON tabs BEGIN
        INSERT INTO tabs_fts(rowid, title, summary, url, domain, category)
        VALUES (new.rowid, new.title, new.summary, new.url, new.domain, new.category);
      END
    `);

    await this.tursoClient.execute(`
      CREATE TRIGGER tabs_fts_delete AFTER DELETE ON tabs BEGIN
        INSERT INTO tabs_fts(tabs_fts, rowid, title, summary, url, domain, category)
        VALUES ('delete', old.rowid, old.title, old.summary, old.url, old.domain, old.category);
      END
    `);

    await this.tursoClient.execute(`
      CREATE TRIGGER tabs_fts_update AFTER UPDATE ON tabs BEGIN
        INSERT INTO tabs_fts(tabs_fts, rowid, title, summary, url, domain, category)
        VALUES ('delete', old.rowid, old.title, old.summary, old.url, old.domain, old.category);
        INSERT INTO tabs_fts(rowid, title, summary, url, domain, category)
        VALUES (new.rowid, new.title, new.summary, new.url, new.domain, new.category);
      END
    `);

    // Create vector index if available
    try {
      await this.tursoClient.execute(`
        CREATE INDEX IF NOT EXISTS tabs_embedding_idx 
        ON tabs(libsql_vector_idx(embedding))
      `);
      console.log('✅ Vector index created');
    } catch (error) {
      console.log('⚠️  Vector index creation skipped (not supported)');
    }

    console.log('✅ Tables recreated successfully');
  }

  async exportData(): Promise<MigrationStats> {
    console.log('📤 Exporting data from local database...');
    
    const users = await this.localDb.select().from(schema.users);
    const folders = await this.localDb.select().from(schema.folders);
    const tabs = await this.localDb.select().from(schema.tabs);
    const tags = await this.localDb.select().from(schema.tags);
    const tabTags = await this.localDb.select().from(schema.tabTags);
    const suggestedFolders = await this.localDb.select().from(schema.suggestedFolders);

    const stats: MigrationStats = {
      users: users.length,
      folders: folders.length,
      tabs: tabs.length,
      tags: tags.length,
      tabTags: tabTags.length,
      suggestedFolders: suggestedFolders.length,
    };

    console.log('📊 Export statistics:', stats);
    return stats;
  }

  async importData(expectedStats: MigrationStats) {
    console.log('📥 Importing data to Turso...');
    
    // Import in dependency order
    console.log('👥 Importing users...');
    const users = await this.localDb.select().from(schema.users);
    if (users.length > 0) {
      await this.tursoDb.insert(schema.users).values(users);
    }

    console.log('📁 Importing folders...');
    const folders = await this.localDb.select().from(schema.folders);
    if (folders.length > 0) {
      await this.tursoDb.insert(schema.folders).values(folders);
    }

    console.log('📑 Importing tabs...');
    const tabs = await this.localDb.select().from(schema.tabs);
    if (tabs.length > 0) {
      await this.tursoDb.insert(schema.tabs).values(tabs);
    }

    console.log('🏷️  Importing tags...');
    const tags = await this.localDb.select().from(schema.tags);
    if (tags.length > 0) {
      await this.tursoDb.insert(schema.tags).values(tags);
    }

    console.log('🔗 Importing tab tags...');
    const tabTags = await this.localDb.select().from(schema.tabTags);
    if (tabTags.length > 0) {
      await this.tursoDb.insert(schema.tabTags).values(tabTags);
    }

    console.log('💡 Importing suggested folders...');
    const suggestedFolders = await this.localDb.select().from(schema.suggestedFolders);
    if (suggestedFolders.length > 0) {
      await this.tursoDb.insert(schema.suggestedFolders).values(suggestedFolders);
    }

    console.log('✅ Data import completed');
  }

  async validateMigration(expectedStats: MigrationStats) {
    console.log('🔍 Validating migration...');
    
    const actualStats: MigrationStats = {
      users: (await this.tursoDb.select().from(schema.users)).length,
      folders: (await this.tursoDb.select().from(schema.folders)).length,
      tabs: (await this.tursoDb.select().from(schema.tabs)).length,
      tags: (await this.tursoDb.select().from(schema.tags)).length,
      tabTags: (await this.tursoDb.select().from(schema.tabTags)).length,
      suggestedFolders: (await this.tursoDb.select().from(schema.suggestedFolders)).length,
    };

    console.log('📊 Validation results:');
    console.log('Expected vs Actual:');
    
    let isValid = true;
    for (const [table, expected] of Object.entries(expectedStats)) {
      const actual = actualStats[table as keyof MigrationStats];
      const status = expected === actual ? '✅' : '❌';
      console.log(`${status} ${table}: ${expected} → ${actual}`);
      if (expected !== actual) {
        isValid = false;
      }
    }

    if (!isValid) {
      throw new Error('Migration validation failed - record counts do not match');
    }

    console.log('✅ Migration validation successful');
  }

  async cleanup() {
    await this.localClient.close();
    await this.tursoClient.close();
  }

  async migrate() {
    try {
      console.log('🚀 Starting database migration from local SQLite to Turso...\n');
      
      await this.validateConnections();
      console.log();
      
      const exportedStats = await this.exportData();
      console.log();
      
      await this.dropAndRecreateTables();
      console.log();
      
      await this.importData(exportedStats);
      console.log();
      
      await this.validateMigration(exportedStats);
      console.log();
      
      console.log('🎉 Migration completed successfully!');
      console.log('💡 You can now set DATABASE_MODE=turso in your .env.local');
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.migrate().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { DatabaseMigrator };