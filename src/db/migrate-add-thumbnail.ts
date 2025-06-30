import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

async function main() {
  console.log('Starting migration to add thumbnail_url column...')
  
  // Create database client (same config as main client)
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  
  const db = drizzle(client)
  
  try {
    // Add thumbnail_url column to tabs table
    await db.run(sql`ALTER TABLE tabs ADD COLUMN thumbnail_url TEXT`)
    console.log('✅ Successfully added thumbnail_url column to tabs table')
    
    console.log('Migration completed successfully!')
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('ℹ️  Column thumbnail_url already exists, skipping...')
    } else {
      console.error('❌ Migration failed:', error)
      throw error
    }
  } finally {
    await client.close()
  }
}

// Import sql from drizzle-orm
import { sql } from 'drizzle-orm'

if (require.main === module) {
  main().catch(console.error)
}