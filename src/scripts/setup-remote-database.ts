import { config } from 'dotenv';
import { runMigration } from '@/db/migrations/001-fix-schema-alignment';
import { client } from '@/db/client';
import { logger } from '@/utils/logger';
import { updateTabEmbedding } from '@/services/jinaEmbeddingService';

// Load environment variables from .env.local
config({ path: '.env.local' });

const TEST_USER_ID = 'test-user-001';

// Sample test data
const testTabs = [
  { title: 'PayPal Payment Processing', url: 'https://paypal.com/payment/process', domain: 'paypal.com', summary: 'Complete your payment transaction securely' },
  { title: 'Stripe Payment Gateway', url: 'https://stripe.com/dashboard', domain: 'stripe.com', summary: 'Manage your online payments and subscriptions' },
  { title: 'React Documentation', url: 'https://react.dev/learn', domain: 'react.dev', summary: 'Learn React hooks, components, and state management' },
  { title: 'TypeScript Handbook', url: 'https://typescriptlang.org/docs', domain: 'typescriptlang.org', summary: 'Complete guide to TypeScript types and interfaces' },
  { title: 'Next.js App Router', url: 'https://nextjs.org/docs/app', domain: 'nextjs.org', summary: 'Build full-stack React applications with App Router' },
  { title: 'Tailwind CSS Components', url: 'https://tailwindui.com/components', domain: 'tailwindui.com', summary: 'Professional UI components built with Tailwind CSS' },
  { title: 'Node.js Express Server', url: 'https://expressjs.com/guide', domain: 'expressjs.com', summary: 'Fast minimalist web framework for Node.js' },
  { title: 'MongoDB Atlas Database', url: 'https://mongodb.com/atlas', domain: 'mongodb.com', summary: 'Cloud database service for modern applications' },
  { title: 'Amazon AWS Console', url: 'https://console.aws.amazon.com', domain: 'aws.amazon.com', summary: 'Manage your AWS cloud infrastructure and services' },
  { title: 'Google Cloud Platform', url: 'https://console.cloud.google.com', domain: 'cloud.google.com', summary: 'Build and deploy applications on Google Cloud' }
];

async function setupRemoteDatabase() {
  logger.info('Setting up remote Turso database...');
  
  try {
    // Verify we're connected to remote database
    const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
    logger.info(`Database URL: ${dbUrl}`);
    
    if (!dbUrl.includes('turso.io')) {
      throw new Error('Expected to be connected to remote Turso database');
    }
    
    // Run migration to create proper schema
    logger.info('Running migration...');
    await runMigration('up');
    
    // Create test user
    logger.info('Creating test user...');
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, display_name, created_at, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [TEST_USER_ID, 'test@example.com', 'Test User']
    });
    
    // Insert test tabs
    logger.info('Inserting test tabs...');
    for (let i = 0; i < testTabs.length; i++) {
      const tab = testTabs[i];
      const tabId = `tab-${String(i + 1).padStart(3, '0')}`;
      
      await client.execute({
        sql: `INSERT OR REPLACE INTO tabs 
              (id, user_id, title, url, domain, summary, status, date_added, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          tabId,
          TEST_USER_ID,
          tab.title,
          tab.url,
          tab.domain,
          tab.summary,
          'unprocessed'
        ]
      });
      
      logger.info(`Inserted tab ${i + 1}: ${tab.title}`);
    }
    
    // Generate embeddings for all tabs
    logger.info('Generating embeddings...');
    for (let i = 0; i < testTabs.length; i++) {
      const tab = testTabs[i];
      const tabId = `tab-${String(i + 1).padStart(3, '0')}`;
      const embeddingText = `${tab.title} ${tab.summary}`;
      
      try {
        await updateTabEmbedding(tabId, embeddingText, 'retrieval.passage');
        logger.info(`Generated embedding for tab ${i + 1}: ${tab.title}`);
      } catch (error) {
        logger.warn(`Failed to generate embedding for tab ${tabId}:`, error);
      }
    }
    
    // Verify setup
    const userResult = await client.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [TEST_USER_ID]
    });
    
    const tabsResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM tabs WHERE user_id = ?',
      args: [TEST_USER_ID]
    });
    
    const embeddingResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM tabs WHERE user_id = ? AND embedding IS NOT NULL',
      args: [TEST_USER_ID]
    });
    
    logger.info('Setup verification:');
    logger.info(`- User exists: ${userResult.rows.length > 0}`);
    logger.info(`- User tabs count: ${(tabsResult.rows[0] as any).count}`);
    logger.info(`- Tabs with embeddings: ${(embeddingResult.rows[0] as any).count}`);
    
    logger.info('Remote database setup completed successfully!');
    
  } catch (error) {
    logger.error('Failed to setup remote database:', error);
    throw error;
  }
}

async function main() {
  await setupRemoteDatabase();
}

main().catch(console.error).finally(() => process.exit(0));