import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const isDevelopment = process.env.NODE_ENV === 'development';

// Database configuration
const config = {
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
};

// Create LibSQL client
export const client = createClient(config);

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Utility function to initialize database (for development)
export async function initializeDatabase() {
  if (isDevelopment) {
    try {
      // Test connection
      await client.execute('SELECT 1');
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
}

// Utility function to generate UUID (since SQLite doesn't have UUID type)
export function generateId(): string {
  return crypto.randomUUID();
}

// Close database connection (useful for cleanup)
export async function closeDatabase() {
  await client.close();
}