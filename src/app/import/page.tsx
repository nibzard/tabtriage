'use client'

import { ImportFormUnified } from '@/components/import/ImportFormUnified'
import { UploadthingImport } from '@/components/import/UploadthingImport'
import { HeaderMobile } from '@/components/HeaderMobile'
import { Header } from '@/components/Header'
import { useTabs } from '@/hooks/useTabs'
import { useResponsive } from '@/hooks/useUI'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ImportPage() {
  const { tabs } = useTabs()
  const { isMobile } = useResponsive()
  const hasExistingTabs = tabs.length > 0

  return (
    <>
      <main className="min-h-screen bg-background pb-safe-area-inset-bottom">
        {isMobile ? <HeaderMobile /> : <Header />}

        <div className="mobile-container mobile-padding-y">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Import Safari Tabs
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Add your Safari tabs to start organizing and triaging
              </p>
            </div>

            {hasExistingTabs && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have {tabs.length} tabs already imported. New tabs will be added to your collection.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick">Quick Import</TabsTrigger>
                <TabsTrigger value="cloud">Cloud Import</TabsTrigger>
              </TabsList>
              
              <TabsContent value="quick" className="mt-6">
                <ImportFormUnified />
              </TabsContent>
              
              <TabsContent value="cloud" className="mt-6">
                <UploadthingImport />
              </TabsContent>
            </Tabs>

          </div>
        </div>
      </main>
      
      {isMobile && <MobileNavigation />}
    </>
  )
}