import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables with cascading precedence
dotenv.config({ path: '.env.local' });
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
dotenv.config({ path: '.env' });

// Environment-aware database configuration
function getDrizzleConfig(): Config {
  const databaseMode = process.env.DATABASE_MODE || 'local';
  
  if (databaseMode === 'turso') {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!url || !authToken) {
      throw new Error(
        'TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required when DATABASE_MODE=turso.\n' +
        'Either set these environment variables or change DATABASE_MODE to "local".'
      );
    }
    
    export default defineConfig({
  schema: './src/db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
  }
  
  // Local SQLite configuration
  return {
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    dialect: 'sqlite',
    dbCredentials: {
      url: 'file:local.db',
    },
    verbose: true,
    strict: true,
  };
}

export default getDrizzleConfig();