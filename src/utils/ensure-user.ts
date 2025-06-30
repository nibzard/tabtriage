import { db } from '@/db/client';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { logger } from './logger';

/**
 * Ensure a user exists in the database, create if not
 */
export async function ensureUserExists(userId: string): Promise<void> {
  try {
    // Use Drizzle ORM with the corrected schema
    await db
      .insert(users)
      .values({
        id: userId,
        email: `${userId}@example.com`,
        displayName: userId,
      })
      .onConflictDoNothing();
    logger.debug(`Ensured user ${userId} exists in database`);
  } catch (error: any) {
    logger.error('Error ensuring user exists:', error);
    throw error;
  }
}