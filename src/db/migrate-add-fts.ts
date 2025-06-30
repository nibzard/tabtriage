import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.TURSO_CONNECTION_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN must be set');
}

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createFTSTable() {
  try {
    console.log('Creating FTS table for full-text search...')
    
    // Drop existing FTS table if it exists
    await client.execute(`DROP TABLE IF EXISTS tabs_fts`)
    
    // Create virtual FTS5 table without user_id
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
    `)
    
    console.log('FTS table created successfully')
    
    // Populate FTS table with existing data
    await client.execute(`
      INSERT INTO tabs_fts (id, title, url, domain, summary, category, content)
      SELECT id, title, url, domain, summary, category, content
      FROM tabs
      WHERE tabs.title IS NOT NULL OR tabs.summary IS NOT NULL OR tabs.content IS NOT NULL
    `)
    
    console.log('FTS table populated with existing data')
    
    // Drop existing triggers if they exist
    await client.execute(`DROP TRIGGER IF EXISTS tabs_fts_insert`)
    await client.execute(`DROP TRIGGER IF EXISTS tabs_fts_update`)
    await client.execute(`DROP TRIGGER IF EXISTS tabs_fts_delete`)
    
    // Create triggers to keep FTS table in sync
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tabs_fts_insert
      AFTER INSERT ON tabs
      BEGIN
        INSERT INTO tabs_fts (id, title, url, domain, summary, category, content)
        VALUES (new.id, new.title, new.url, new.domain, new.summary, new.category, new.content);
      END
    `)
    
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tabs_fts_update
      AFTER UPDATE ON tabs
      BEGIN
        UPDATE tabs_fts
        SET title = new.title,
            url = new.url,
            domain = new.domain,
            summary = new.summary,
            category = new.category,
            content = new.content
        WHERE id = new.id;
      END
    `)
    
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tabs_fts_delete
      AFTER DELETE ON tabs
      BEGIN
        DELETE FROM tabs_fts WHERE id = old.id;
      END
    `)
    
    console.log('FTS triggers created successfully')
    
  } catch (error) {
    console.error('Error creating FTS table:', error)
    throw error
  }
}

// Run the migration
createFTSTable()
  .then(() => {
    console.log('FTS migration completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('FTS migration failed:', error)
    process.exit(1)
  })
process.exit(0);