import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { getDatabaseConfig, getEnvironmentSummary, isDevelopment } from '@/lib/env';

// Get validated database configuration
const dbConfig = getDatabaseConfig();

// Create LibSQL client with validated config
export const client = createClient({
  url: dbConfig.url,
  authToken: dbConfig.authToken,
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Utility function to initialize database (for development)
export async function initializeDatabase() {
  if (isDevelopment) {
    try {
      // Test connection
      await client.execute('SELECT 1');
      console.log('✅ Database connection successful');
      
      // Log environment summary in development
      const envSummary = getEnvironmentSummary();
      console.log('📊 Environment Summary:', {
        environment: envSummary.environment,
        database: envSummary.database,
        hasRequiredServices: {
          auth: envSummary.auth.nextauth,
          openai: envSummary.services.openai,
          uploadthing: envSummary.services.uploadthing,
        }
      });
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.error('🔧 Check your environment configuration');
      
      const envSummary = getEnvironmentSummary();
      console.error('📊 Current config:', envSummary.database);
      
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