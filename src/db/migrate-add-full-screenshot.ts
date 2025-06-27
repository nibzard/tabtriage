import { client } from './client';

export async function addFullScreenshotColumn() {
  try {
    console.log('🚀 Adding full_screenshot_url column to tabs table...');
    
    // Check if column already exists
    const result = await client.execute("PRAGMA table_info(tabs)");
    const columns = result.rows.map(row => row.name);
    
    if (columns.includes('full_screenshot_url')) {
      console.log('⚠️  Column full_screenshot_url already exists, skipping...');
      return;
    }
    
    // Add the new column
    await client.execute(`
      ALTER TABLE tabs 
      ADD COLUMN full_screenshot_url TEXT
    `);
    
    console.log('✅ Successfully added full_screenshot_url column to tabs table!');
  } catch (error) {
    console.error('❌ Failed to add full_screenshot_url column:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  addFullScreenshotColumn()
    .then(() => {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}