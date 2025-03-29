import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Create a Supabase client for server components
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  return supabase;
}

/**
 * Get the current user session on the server
 */
export async function getServerSession() {
  const supabase = createServerSupabaseClient();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    logger.error('Error in getServerSession:', error);
    return null;
  }
}

/**
 * Redirect to login if no session exists
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    redirect('/');
  }
  return session;
}

/**
 * Get the current user ID on the server
 */
export async function getServerUserId() {
  const session = await getServerSession();
  return session?.user?.id || null;
}

// Storage bucket for tab screenshots
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'tab-screenshots';