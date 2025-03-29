import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/utils/supabase-server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()

  // Skip middleware for public routes and API routes
  if (request.nextUrl.pathname === '/' || 
      request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.startsWith('/api')) {
    return res
  }

  // For now, allow all requests to proceed
  // This will let us test the app without authentication
  // The client-side code will create an anonymous session if needed
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