'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, ReactNode, useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { TabsProvider } from '@/context/TabsContext'
import { FoldersProvider } from '@/context/FoldersContext'
import { UIProvider } from '@/context/UIContext'
import { TabProvider } from '@/context/TabContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
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
          <TabProvider>
            <TabsProvider>
              <FoldersProvider>
                <UIProvider>
                  {mounted && children}
                </UIProvider>
              </FoldersProvider>
            </TabsProvider>
          </TabProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}