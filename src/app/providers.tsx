'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, ReactNode, useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/context/AuthContext'
import { FoldersProvider } from '@/context/FoldersContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('4')) {
            return false
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: false, // Disable automatic refetch on window focus
      },
      mutations: {
        retry: 1,
      },
    },
  }))
  
  const [mounted, setMounted] = useState(false)

  // Ensure theme is only applied after mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <FoldersProvider>
              {mounted && children}
            </FoldersProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}