const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');

async function fixThumbnailData() {
  console.log('Starting database cleanup for thumbnail_url field...');
  
  // Create database client (same config as main client)
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  const db = drizzle(client);
  
  try {
    // Check current state of the database
    console.log('Checking current thumbnail_url values...');
    const result = await client.execute(`
      SELECT id, title, thumbnail_url, screenshot_url 
      FROM tabs 
      WHERE thumbnail_url = 'thumbnail_url'
    `);
    
    console.log(`Found ${result.rows.length} tabs with literal 'thumbnail_url' string`);
    
    if (result.rows.length > 0) {
      console.log('Sample affected tabs:');
      result.rows.slice(0, 5).forEach(row => {
        console.log(`- ${row.title}: ${row.thumbnail_url}`);
      });
      
      // Update all records that have the literal string "thumbnail_url" to NULL
      console.log('Updating thumbnail_url values from literal string to NULL...');
      const updateResult = await client.execute(`
        UPDATE tabs 
        SET thumbnail_url = NULL 
        WHERE thumbnail_url = 'thumbnail_url'
      `);
      
      console.log(`✅ Successfully updated ${updateResult.rowsAffected} rows`);
    } else {
      console.log('ℹ️  No tabs found with literal "thumbnail_url" string');
    }
    
    // Show final state
    const finalResult = await client.execute(`
      SELECT 
        COUNT(*) as total_tabs,
        COUNT(thumbnail_url) as tabs_with_thumbnails,
        COUNT(CASE WHEN thumbnail_url = 'thumbnail_url' THEN 1 END) as tabs_with_literal_string
      FROM tabs
    `);
    
    console.log('\nFinal state:');
    console.log(`- Total tabs: ${finalResult.rows[0].total_tabs}`);
    console.log(`- Tabs with actual thumbnail URLs: ${finalResult.rows[0].tabs_with_thumbnails}`);
    console.log(`- Tabs with literal "thumbnail_url" string: ${finalResult.rows[0].tabs_with_literal_string}`);
    
    console.log('\n✅ Database cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the script
if (require.main === module) {
  fixThumbnailData().catch(console.error);
}

module.exports = { fixThumbnailData };