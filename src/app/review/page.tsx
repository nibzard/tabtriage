'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTabs } from '@/hooks/useTabs'
import { Tab } from '@/types/Tab'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Check, Trash2, Loader2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { HeaderMobile } from '@/components/HeaderMobile'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { useResponsive } from '@/hooks/useUI'

export default function ReviewPage() {
  const { tabs, keepTab, discardTab } = useTabs()
  const { isMobile } = useResponsive()
  const router = useRouter()

  const unprocessedTabs = useMemo(() => tabs.filter(t => t.status === 'unprocessed'), [tabs])
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const currentTab = unprocessedTabs[currentIndex]

  const handleAction = async (action: (tabId: string) => Promise<void>) => {
    if (!currentTab || isLoading) return
    
    setIsLoading(true)
    try {
      await action(currentTab.id)
      if (currentIndex >= unprocessedTabs.length - 1) {
        router.push('/workspace')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < unprocessedTabs.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      router.push('/workspace')
    }
  }

  useEffect(() => {
    if (tabs.length > 0 && unprocessedTabs.length === 0) {
      router.push('/workspace')
    }
  }, [tabs, unprocessedTabs, router])

  if (unprocessedTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No tabs to review</h2>
          <p className="text-muted-foreground mb-6">
            You've triaged all your tabs.
          </p>
          <Button asChild>
            <Link href="/workspace">Back to Workspace</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!currentTab) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-background pb-safe-area-inset-bottom">
        {isMobile ? <HeaderMobile /> : <Header />}
        <div className="mobile-container mobile-padding-y">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Review Tab ({currentIndex + 1} of {unprocessedTabs.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg">{currentTab.title}</h3>
                  <a
                    href={currentTab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {currentTab.url}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={isLoading || currentIndex === 0}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => handleAction(discardTab)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Discard
                    </Button>
                    <Button onClick={() => handleAction(keepTab)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Keep
                    </Button>
                  </div>
                  <Button variant="outline" onClick={handleNext} disabled={isLoading}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      {isMobile && <MobileNavigation />}
    </>
  )
}
