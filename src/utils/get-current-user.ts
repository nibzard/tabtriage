import { logger } from './logger';

// For testing purposes, we can override the user ID
const TEST_USER_ID = 'test-user-001';
const DEFAULT_USER_ID = 'test-user-001'; // Use test user as default for now

export function getCurrentUserId(request?: Request): string {
  // Check for test mode in query params
  if (request) {
    const url = new URL(request.url);
    const testMode = url.searchParams.get('test');
    if (testMode === 'true') {
      logger.debug('Using test user ID');
      return TEST_USER_ID;
    }
  }
  
  // Check environment variable
  if (process.env.TEST_MODE === 'true') {
    return TEST_USER_ID;
  }
  
  // TODO: Replace with proper auth when NextAuth is integrated
  return DEFAULT_USER_ID;
}