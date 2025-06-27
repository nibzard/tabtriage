import { client } from './client';

async function migrateToJinaEmbeddings() {
  try {
    console.log('🔄 Migrating database for Jina Embeddings v3...');
    
    // Drop the old embedding column and index if they exist
    console.log('Dropping old embedding column and index...');
    try {
      await client.execute(`DROP INDEX IF EXISTS tabs_embedding_idx`);
      await client.execute(`ALTER TABLE tabs DROP COLUMN embedding_vector`);
    } catch (error) {
      console.log('Old column/index might not exist, continuing...');
    }
    
    // Add the new embedding column for Jina v3 (1024 dimensions)
    await client.execute(`
      ALTER TABLE tabs ADD COLUMN embedding_vector F32_BLOB(1024)
    `);
    console.log('✅ Added embedding_vector column (1024 dimensions)');
    
    // Create vector index for Jina embeddings
    await client.execute(`
      CREATE INDEX IF NOT EXISTS tabs_embedding_idx 
      ON tabs(libsql_vector_idx(embedding_vector))
    `);
    console.log('✅ Created vector index for Jina embeddings');
    
    // Update FTS5 virtual table to ensure it's properly configured
    await client.execute(`
      DROP TABLE IF EXISTS tabs_fts
    `);
    
    await client.execute(`
      CREATE VIRTUAL TABLE tabs_fts 
      USING fts5(id UNINDEXED, title, summary, url, content='tabs', content_rowid='rowid')
    `);
    console.log('✅ Recreated FTS5 virtual table');
    
    // Populate FTS5 table with existing data
    await client.execute(`
      INSERT INTO tabs_fts(id, title, summary, url)
      SELECT id, title, COALESCE(summary, ''), url FROM tabs
    `);
    console.log('✅ Populated FTS5 table with existing data');
    
    console.log('🎉 Migration to Jina Embeddings v3 completed successfully!');
    console.log('📊 Next steps:');
    console.log('   1. Run embedding generation for existing tabs');
    console.log('   2. Test vector search functionality');
    console.log('   3. Update API endpoints to use new embedding service');
    
  } catch (error) {
    console.error('❌ Error during Jina migration:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  migrateToJinaEmbeddings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { migrateToJinaEmbeddings };