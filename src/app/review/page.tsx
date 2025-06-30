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
import { ScreenshotPreviewModal } from '@/components/ui/screenshot-preview-modal'

export default function ReviewPage() {
  const { tabs, keepTab, discardTab } = useTabs()
  const { isMobile } = useResponsive()
  const router = useRouter()

  const unprocessedTabs = useMemo(() => tabs.filter(t => t.status === 'unprocessed'), [tabs])
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or the preview modal is open
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || isPreviewOpen) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'x':
          event.preventDefault()
          handleAction(discardTab)
          break
        case 'y':
          event.preventDefault()
          handleAction(keepTab)
          break
        case 'arrowleft':
          event.preventDefault()
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
          }
          break
        case 'arrowright':
          event.preventDefault()
          handleNext()
          break
        case ' ':
          event.preventDefault()
          setIsPreviewOpen(true)
          break
        case 'escape':
          if (isPreviewOpen) {
            event.preventDefault()
            setIsPreviewOpen(false)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, currentTab, isLoading, isPreviewOpen, keepTab, discardTab, handleAction, handleNext])

  if (unprocessedTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No tabs to review</h2>
          <p className="text-muted-foreground mb-6">
            You&apos;ve triaged all your tabs.
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
                <div className="flex items-center justify-between">
                  <CardTitle>Review Tab ({currentIndex + 1} of {unprocessedTabs.length})</CardTitle>
                  {!isMobile && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Shortcuts: <span className="font-mono bg-muted px-1 rounded">X</span> discard, <span className="font-mono bg-muted px-1 rounded">Y</span> keep</div>
                      <div><span className="font-mono bg-muted px-1 rounded">←→</span> navigate, <span className="font-mono bg-muted px-1 rounded">Space</span> preview</div>
                    </div>
                  )}
                </div>
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

                {/* Screenshot Preview */}
                {(currentTab.thumbnail || currentTab.screenshot) && (
                  <div 
                    className="rounded-lg overflow-hidden bg-muted cursor-pointer group relative"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    <img 
                      src={currentTab.thumbnail || currentTab.screenshot} 
                      alt={currentTab.title} 
                      className="w-full h-64 object-cover transition-transform group-hover:scale-105" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">Click to preview full screenshot</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {currentTab.summary && (
                  <div className="text-sm text-muted-foreground leading-6 bg-muted/50 p-4 rounded-lg">
                    {currentTab.summary}
                  </div>
                )}

                {/* Tags */}
                {currentTab.tags && currentTab.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentTab.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
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
      
      {/* Screenshot Preview Modal */}
      {currentTab && (
        <ScreenshotPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          tab={currentTab}
        />
      )}
    </>
  )
}
