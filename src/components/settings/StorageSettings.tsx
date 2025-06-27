'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { 
  Cloud, 
  HardDrive, 
  Upload, 
  Download,
  Database,
  Loader2,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useTabs } from '@/hooks/useTabs'
import { fileStorageService, storageMigrationService } from '@/services/fileStorageService'

export function StorageSettings() {
  const { tabs } = useTabs()
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState(0)
  const [migrationStats, setMigrationStats] = useState<{
    migrated: number
    failed: number
    skipped: number
  } | null>(null)

  // Calculate storage statistics
  const storageStats = {
    totalTabs: tabs.length,
    tabsWithScreenshots: tabs.filter(tab => tab.screenshot).length,
    dataUrlScreenshots: tabs.filter(tab => 
      tab.screenshot && fileStorageService.isDataUrl(tab.screenshot)
    ).length,
    cloudScreenshots: tabs.filter(tab => 
      tab.screenshot && !fileStorageService.isDataUrl(tab.screenshot)
    ).length
  }

  const currentProvider = process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'local'

  const handleMigrateToCloud = async () => {
    if (storageStats.dataUrlScreenshots === 0) {
      toast.info('No local screenshots to migrate')
      return
    }

    setIsMigrating(true)
    setMigrationProgress(0)
    setMigrationStats(null)

    try {
      const tabsWithDataUrls = tabs.filter(tab => 
        tab.screenshot && fileStorageService.isDataUrl(tab.screenshot)
      )

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => Math.min(prev + 2, 90))
      }, 200)

      const result = await storageMigrationService.migrateScreenshots(tabsWithDataUrls)
      
      clearInterval(progressInterval)
      setMigrationProgress(100)
      setMigrationStats(result)

      if (result.migrated > 0) {
        toast.success(`Successfully migrated ${result.migrated} screenshots to cloud storage`)
      } else {
        toast.error('No screenshots were migrated')
      }
    } catch (error) {
      console.error('Migration error:', error)
      toast.error('Failed to migrate screenshots')
    } finally {
      setIsMigrating(false)
    }
  }

  const calculateStorageSize = () => {
    // Rough estimate: each data URL screenshot is ~50-100KB
    const avgDataUrlSize = 75 * 1024 // 75KB
    const localStorageSize = storageStats.dataUrlScreenshots * avgDataUrlSize
    
    return {
      localSize: localStorageSize,
      localSizeFormatted: formatBytes(localStorageSize),
      cloudSize: storageStats.cloudScreenshots * avgDataUrlSize,
      cloudSizeFormatted: formatBytes(storageStats.cloudScreenshots * avgDataUrlSize)
    }
  }

  const storageSize = calculateStorageSize()

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{storageStats.totalTabs}</div>
              <div className="text-sm text-muted-foreground">Total Tabs</div>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{storageStats.tabsWithScreenshots}</div>
              <div className="text-sm text-muted-foreground">With Screenshots</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{storageStats.dataUrlScreenshots}</div>
              <div className="text-sm text-muted-foreground">Local Storage</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{storageStats.cloudScreenshots}</div>
              <div className="text-sm text-muted-foreground">Cloud Storage</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              <span className="font-medium">Current Provider</span>
            </div>
            <Badge variant={currentProvider === 'uploadthing' ? 'default' : 'secondary'}>
              {currentProvider === 'uploadthing' ? 'Uploadthing (Cloud)' : 'Local Storage'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Storage Size Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Local Storage (Data URLs)</span>
              </div>
              <span className="text-sm font-medium">{storageSize.localSizeFormatted}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Cloud Storage</span>
              </div>
              <span className="text-sm font-medium">{storageSize.cloudSizeFormatted}</span>
            </div>
          </div>

          {storageStats.dataUrlScreenshots > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have {storageStats.dataUrlScreenshots} screenshots stored locally as data URLs. 
                Migrating to cloud storage will improve performance and reduce browser storage usage.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Migration Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Storage Migration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentProvider === 'local' ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cloud storage is not configured. Set up Uploadthing to enable cloud migration.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {storageStats.dataUrlScreenshots > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Migrate {storageStats.dataUrlScreenshots} local screenshots to cloud storage for better performance.
                  </p>
                  
                  {!isMigrating && !migrationStats && (
                    <Button onClick={handleMigrateToCloud} className="w-full">
                      <Cloud className="h-4 w-4 mr-2" />
                      Migrate to Cloud Storage
                    </Button>
                  )}

                  {isMigrating && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Migrating screenshots...</span>
                      </div>
                      <Progress value={migrationProgress} className="w-full" />
                      <p className="text-xs text-muted-foreground text-center">
                        {migrationProgress}% complete
                      </p>
                    </div>
                  )}

                  {migrationStats && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">Migration Complete</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>✅ Migrated: {migrationStats.migrated}</div>
                        <div>⏭️ Skipped: {migrationStats.skipped}</div>
                        {migrationStats.failed > 0 && (
                          <div>❌ Failed: {migrationStats.failed}</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Check className="h-8 w-8 text-green-500 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    All screenshots are already stored in the cloud
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Storage Provider Info */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Provider Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Current Provider:</span>
              <Badge>{currentProvider}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Fallback to Local:</span>
              <Badge variant="outline">Enabled</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Auto Screenshot Storage:</span>
              <Badge variant="outline">{currentProvider === 'uploadthing' ? 'Cloud' : 'Local'}</Badge>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Storage provider can be changed by updating the STORAGE_PROVIDER environment variable.
              Supported providers: uploadthing, local, r2 (coming soon).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}