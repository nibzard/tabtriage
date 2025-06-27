import { logger } from './logger';
import { signIn, signOut } from 'next-auth/react';

/**
 * Sign in with magic link
 */
export async function signInWithMagicLink(email: string): Promise<{ error?: Error }> {
  try {
    const result = await signIn('email', { email, redirect: false });
    if (result?.error) {
      throw new Error(result.error);
    }
    return {};
  } catch (error) {
    logger.error('Error in signInWithMagicLink:', error);
    return { error: error as Error };
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<{ error?: Error }> {
  try {
    await signOut({ redirect: false });
    return {};
  } catch (error) {
    logger.error('Exception in signOutUser:', error);
    return { error: error as Error };
  }
}
