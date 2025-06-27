import { client } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the schema SQL file
    const schemaPath = join(process.cwd(), 'src', 'db', 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    
    // Split by semicolons but handle multi-line statements
    const statements = [];
    let currentStatement = '';
    const lines = schemaSql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // If line ends with semicolon, it's the end of a statement
      if (trimmedLine.endsWith(';')) {
        const statement = currentStatement.trim();
        if (statement) {
          statements.push(statement);
        }
        currentStatement = '';
      }
    }
    
    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      } catch (error: any) {
        // Ignore "table already exists" errors
        if (!error.message?.includes('already exists')) {
          console.error('❌ Error executing statement:', statement.substring(0, 100));
          throw error;
        } else {
          console.log('⚠️  Table already exists, skipping...');
        }
      }
    }
    
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}