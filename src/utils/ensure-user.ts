import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';

/**
 * Ensure a user exists in the database, create if not
 */
export async function ensureUserExists(userId: string): Promise<void> {
  try {
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (existingUser.length === 0) {
      // Create the user
      await db.insert(users).values({
        id: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      logger.debug(`Created user ${userId} in database`);
    }
  } catch (error) {
    logger.error('Error ensuring user exists:', error);
    throw error;
  }
}