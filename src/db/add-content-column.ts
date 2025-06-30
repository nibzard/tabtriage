/**
 * Add content column to tabs table
 * Simple migration script that doesn't depend on complex environment validation
 */

import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function addContentColumn() {
  // Create simple client for migration
  const client = createClient({
    url: process.env.DATABASE_MODE === 'turso' 
      ? process.env.TURSO_DATABASE_URL || 'file:local.db'
      : 'file:local.db',
    authToken: process.env.DATABASE_MODE === 'turso' 
      ? process.env.TURSO_AUTH_TOKEN 
      : undefined,
  });

  try {
    console.log('🔧 Starting migration: Add content column to tabs table');

    // Check if content column already exists
    const tableInfo = await client.execute({
      sql: `PRAGMA table_info(tabs)`,
      args: []
    });

    const columns = tableInfo.rows.map((row: any) => row.name);
    
    if (columns.includes('content')) {
      console.log('✅ Content column already exists');
      return;
    }

    // Add content column to tabs table
    await client.execute({
      sql: `ALTER TABLE tabs ADD COLUMN content TEXT`,
      args: []
    });

    console.log('✅ Successfully added content column to tabs table');

    // Verify the column was added
    const verifyResult = await client.execute({
      sql: `PRAGMA table_info(tabs)`,
      args: []
    });

    const newColumns = verifyResult.rows.map((row: any) => row.name);
    if (newColumns.includes('content')) {
      console.log('✅ Content column verified in tabs table');
      console.log(`📊 Total columns in tabs table: ${newColumns.length}`);
    } else {
      throw new Error('Content column not found after migration');
    }

  } catch (error) {
    console.error('❌ Failed to add content column:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the migration
addContentColumn()
  .then(() => {
    console.log('🎉 Content column migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Content column migration failed:', error);
    process.exit(1);
  });