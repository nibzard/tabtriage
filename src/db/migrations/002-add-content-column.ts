/**
 * Migration: Add content column to tabs table
 * Adds a text column to store the extracted page content used for embedding generation
 */

import { client } from '../client';
import { logger } from '@/utils/logger';

export async function addContentColumn(): Promise<void> {
  try {
    logger.info('Starting migration: Add content column to tabs table');

    // Add content column to tabs table
    await client.execute({
      sql: `ALTER TABLE tabs ADD COLUMN content TEXT`,
      args: []
    });

    logger.info('✅ Successfully added content column to tabs table');

    // Verify the column was added
    const result = await client.execute({
      sql: `PRAGMA table_info(tabs)`,
      args: []
    });

    const columns = result.rows.map((row: any) => row.name);
    if (columns.includes('content')) {
      logger.info('✅ Content column verified in tabs table');
    } else {
      throw new Error('Content column not found after migration');
    }

  } catch (error) {
    logger.error('❌ Failed to add content column:', error);
    throw error;
  }
}

// Allow direct execution of this migration
if (require.main === module) {
  addContentColumn()
    .then(() => {
      logger.info('🎉 Content column migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Content column migration failed:', error);
      process.exit(1);
    });
}