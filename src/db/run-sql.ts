import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Please provide a SQL file to execute.');
    process.exit(1);
  }

  const db = drizzle(createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  }));

  const sql = fs.readFileSync(path.resolve(sqlFile), 'utf-8');
  const statements = sql.split(';').filter(s => s.trim());

  for (const statement of statements) {
    await db.run(statement);
  }

  console.log('SQL file executed successfully.');
}

main().catch(err => {
  console.error('Error executing SQL file:', err);
  process.exit(1);
});
