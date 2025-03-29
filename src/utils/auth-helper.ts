import { supabase } from './supabase';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the current user ID, or create an anonymous session if none exists
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    // Try to get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If there's a valid session, return the user ID
    if (session?.user?.id) {
      logger.debug('Found existing user session');
      return session.user.id;
    }
    
    // No session, so create an anonymous session
    logger.info('No session found, creating anonymous session');
    
    // Generate a random email and password for the anonymous user
    const anonymousEmail = `anonymous-${uuidv4()}@example.com`;
    const anonymousPassword = uuidv4();
    
    // Sign up the anonymous user
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: anonymousEmail,
      password: anonymousPassword,
    });
    
    if (signUpError) {
      logger.error('Error creating anonymous session:', signUpError);
      throw signUpError;
    }
    
    if (!user?.id) {
      logger.error('Failed to create anonymous user');
      throw new Error('Failed to create anonymous user');
    }
    
    logger.info('Created anonymous session');
    return user.id;
  } catch (error) {
    logger.error('Error in getCurrentUserId:', error);
    throw error;
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
 * Sign in with magic link
 */
export async function signInWithMagicLink(email: string): Promise<{ error?: Error }> {
  try {
    logger.debug(`Sending magic link to: ${email}`);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
    
    if (error) {
      logger.error('Error sending magic link:', error);
      return { error };
    }
    
    logger.debug('Magic link sent successfully');
    return {};
  } catch (error) {
    logger.error('Exception in signInWithMagicLink:', error);
    return { error: error as Error };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error?: Error }> {
  try {
    logger.debug('Signing out user');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Error signing out:', error);
      return { error };
    }
    
    logger.debug('User signed out successfully');
    return {};
  } catch (error) {
    logger.error('Exception in signOut:', error);
    return { error: error as Error };
  }
}