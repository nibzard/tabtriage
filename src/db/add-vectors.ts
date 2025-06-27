import { client } from './client';

async function addVectorSupport() {
  try {
    console.log('🚀 Adding vector support to Turso database...');
    
    // Add the proper embedding column (F32_BLOB instead of TEXT)
    await client.execute(`
      ALTER TABLE tabs ADD COLUMN embedding_vector F32_BLOB(384)
    `);
    console.log('✅ Added embedding_vector column');
    
    // Create vector index
    await client.execute(`
      CREATE INDEX IF NOT EXISTS tabs_embedding_idx 
      ON tabs(libsql_vector_idx(embedding_vector))
    `);
    console.log('✅ Created vector index');
    
    // Create FTS5 virtual table
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS tabs_fts 
      USING fts5(id UNINDEXED, title, summary, url, content='tabs', content_rowid='rowid')
    `);
    console.log('✅ Created FTS5 virtual table');
    
    console.log('✅ Vector support added successfully!');
  } catch (error) {
    console.error('❌ Error adding vector support:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  addVectorSupport()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { addVectorSupport };