'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Upload, FileText, Check, AlertCircle, Loader2, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UploadDropzone } from '@/utils/uploadthing'
import { useUploadThing } from '@/utils/uploadthing'
import { useTabs } from '@/hooks/useTabs'
import { uploadTabImportFile } from '@/services/uploadthingService'
import { parseTabsFromFile } from '@/services/tabService'

interface UploadthingImportProps {
  onImportComplete?: () => void
}

export function UploadthingImport({ onImportComplete }: UploadthingImportProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string }>>([])
  const [progress, setProgress] = useState(0)
  const [processingMessage, setProcessingMessage] = useState('')
  
  const { addTabs } = useTabs()

  const handleUploadComplete = async (res: Array<{ url: string; name: string; key: string; size: number }>) => {
    try {
      const files = res.map(file => ({ name: file.name, url: file.url }))
      setUploadedFiles(files)
      toast.success(`Uploaded ${files.length} file(s) successfully!`)
      
      // Auto-process if it's a single file
      if (files.length === 1) {
        await processUploadedFiles(files)
      }
    } catch (error) {
      console.error('Upload completion error:', error)
      toast.error('Error handling uploaded files')
    }
  }

  const processUploadedFiles = async (filesToProcess: Array<{ url: string; name: string }>) => {
    setIsProcessing(true)
    setProgress(0)
    setProcessingMessage('Processing uploaded files...')

    try {
      let allTabs: any[] = []

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i]
        setProcessingMessage(`Processing ${file.name}...`)
        
        // Download and parse the file from Uploadthing URL
        const response = await fetch(file.url)
        if (!response.ok) {
          throw new Error(`Failed to download ${file.name}`)
        }

        const blob = await response.blob()
        const fileObj = new File([blob], file.name, { type: blob.type })
        
        const tabs = await parseTabsFromFile(fileObj)
        allTabs.push(...tabs)
        
        const progressPercent = ((i + 1) / filesToProcess.length) * 50 // First 50% for parsing
        setProgress(progressPercent)
      }

      if (allTabs.length === 0) {
        toast.error('No valid URLs found in uploaded files')
        return
      }

      setProcessingMessage(`Importing ${allTabs.length} tabs...`)
      
      // Process in batches
      const BATCH_SIZE = 10
      const totalBatches = Math.ceil(allTabs.length / BATCH_SIZE)
      
      for (let i = 0; i < allTabs.length; i += BATCH_SIZE) {
        const batch = allTabs.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        
        setProcessingMessage(`Importing batch ${batchNumber}/${totalBatches}...`)
        
        await addTabs(batch)
        
        const progressPercent = 50 + ((i + BATCH_SIZE) / allTabs.length) * 50 // Second 50% for importing
        setProgress(Math.min(progressPercent, 100))
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Success
      toast.success(`Successfully imported ${allTabs.length} tabs from ${filesToProcess.length} file(s)!`)
      setUploadedFiles([])
      onImportComplete?.()
      
    } catch (error) {
      console.error('Processing error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process files')
    } finally {
      setIsProcessing(false)
      setProgress(0)
      setProcessingMessage('')
    }
  }

  const handleProcessFiles = () => {
    if (uploadedFiles.length > 0) {
      processUploadedFiles(uploadedFiles)
    }
  }

  const clearUploadedFiles = () => {
    setUploadedFiles([])
  }

  return (
    <div className="space-y-6">
      {/* Cloud Upload Area */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Cloud File Import
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload large tab export files to the cloud for processing. Ideal for files over 1MB or batch processing.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isProcessing && uploadedFiles.length === 0 && (
            <UploadDropzone
              endpoint="tabImport"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={(error: Error) => {
                console.error('Upload error:', error)
                toast.error(`Upload failed: ${error.message}`)
              }}
              appearance={{
                container: "border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-colors",
                uploadIcon: "text-muted-foreground",
                label: "text-foreground",
                allowedContent: "text-muted-foreground text-sm",
                button: "bg-primary text-primary-foreground hover:bg-primary/90"
              }}
            />
          )}

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Uploaded Files</h3>
                <Badge variant="secondary">{uploadedFiles.length} file(s)</Badge>
              </div>
              
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1">{file.name}</span>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleProcessFiles} className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  Process Files
                </Button>
                <Button variant="outline" onClick={clearUploadedFiles}>
                  Clear
                </Button>
              </div>
            </motion.div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4 py-8"
            >
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                
                <div className="space-y-2 w-full max-w-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{processingMessage}</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      className="bg-primary h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Cloud Import Benefits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Process large files (up to 2MB for HTML, 1MB for text)</li>
                <li>• Batch processing of multiple files</li>
                <li>• Reliable handling of complex bookmark exports</li>
                <li>• Automatic file cleanup after processing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}