'use client'

import { Header } from '@/components/Header'
import { HeaderMobile } from '@/components/HeaderMobile'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { useTabs } from '@/hooks/useTabs'
import { useResponsive } from '@/hooks/useUI'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Inbox, CheckCircle, Trash2, Upload } from 'lucide-react'

export default function DashboardPage() {
  const { tabs } = useTabs()
  const { isMobile } = useResponsive()

  const unprocessedCount = tabs.filter(t => t.status === 'unprocessed').length
  const keptCount = tabs.filter(t => t.status === 'kept').length
  const discardedCount = tabs.filter(t => t.status === 'discarded').length

  const hasTabs = tabs.length > 0

  return (
    <>
      <main className="min-h-screen bg-background pb-safe-area-inset-bottom">
        {isMobile ? <HeaderMobile /> : <Header />}

        <div className="mobile-container mobile-padding-y">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

            {hasTabs ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unprocessed</CardTitle>
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{unprocessedCount}</div>
                    <p className="text-xs text-muted-foreground">tabs to be triaged</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Kept</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{keptCount}</div>
                    <p className="text-xs text-muted-foreground">tabs saved</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Discarded</CardTitle>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{discardedCount}</div>
                    <p className="text-xs text-muted-foreground">tabs removed</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                <div className="p-12 bg-muted/30 rounded-full w-fit mx-auto">
                  <Upload className="h-16 w-16 text-muted-foreground" />
                </div>
                <h2 className="mt-6 text-xl font-semibold">No tabs yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Import your tabs to get started.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/import">Import Tabs</Link>
                </Button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Start Triaging</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Go to your workspace to start organizing your tabs.
                  </p>
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link href="/workspace">Workspace</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/review">Review Mode</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Import More</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Add more tabs to your collection.
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/import">Import Tabs</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      {isMobile && <MobileNavigation />}
    </>
  )
}
