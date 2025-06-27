import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the current user ID, or create an anonymous session if none exists
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    // Check for stored user ID first
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('currentUserId');
      if (storedId) {
        logger.debug('Using stored user ID:', storedId);
        return storedId;
      }
    }
    
    // Generate a new anonymous user ID
    const fallbackId = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUserId', fallbackId);
    }
    logger.debug('Created new anonymous user ID:', fallbackId);
    return fallbackId;
  } catch (error) {
    logger.error('Error in getCurrentUserId:', error);
    
    // Last resort fallback - generate a valid UUID
    const fallbackId = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUserId', fallbackId);
    }
    logger.warn('Using fallback UUID due to error:', fallbackId);
    return fallbackId;
  }
}

/**
 * Ensure the user has a valid session (create one if needed)
 */
export async function ensureSession(): Promise<void> {
  try {
    await getCurrentUserId();
    logger.debug('User session confirmed');
  } catch (error) {
    logger.error('Failed to ensure user session:', error);
    throw error;
  }
}

/**
 * Sign in with magic link - TODO: Implement with chosen auth system
 */
export async function signInWithMagicLink(email: string): Promise<{ error?: Error }> {
  logger.warn('signInWithMagicLink not implemented - auth system migration needed');
  return { error: new Error('Auth system not implemented') };
}

/**
 * Sign out the current user - TODO: Implement with chosen auth system
 */
export async function signOut(): Promise<{ error?: Error }> {
  try {
    logger.debug('Signing out user');
    
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUserId');
    }
    
    logger.debug('User signed out successfully');
    return {};
  } catch (error) {
    logger.error('Exception in signOut:', error);
    return { error: error as Error };
  }
}