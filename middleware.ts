import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/utils/supabase-server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()

  // Skip middleware for public routes
  if (request.nextUrl.pathname === '/' || 
      request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.startsWith('/api')) {
    return res
  }

  // Create a Supabase client for the middleware
  const supabase = createServerSupabaseClient()

  // Get the user's session
  const { data: { session } } = await supabase.auth.getSession()

  // If no session and not on a public route, redirect to home page
  if (!session) {
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Apply the middleware to specific paths
export const config = {
  matcher: [
    '/folders/:path*',
    '/gallery/:path*',
    '/import/:path*',
  ],
}