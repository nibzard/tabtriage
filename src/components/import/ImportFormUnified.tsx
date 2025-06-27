'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { 
  Upload, 
  FileText, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  HelpCircle,
  Smartphone,
  Monitor,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTabs } from '@/hooks/useTabs'
import { parseTabsFromText, parseTabsFromFile } from '@/services/tabService'
import { useResponsive } from '@/hooks/useUI'

interface ImportFormUnifiedProps {
  onImportComplete?: () => void
}

export function ImportFormUnified({ onImportComplete }: ImportFormUnifiedProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [validUrlCount, setValidUrlCount] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processingMessage, setProcessingMessage] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addTabs } = useTabs()
  const { isMobile } = useResponsive()

  // Real-time URL validation
  const validateUrls = useCallback((text: string) => {
    if (!text.trim()) {
      setValidUrlCount(0)
      return
    }
    
    try {
      const urls = text.split(/[\n\r\s,]+/).filter(Boolean)
      const urlPattern = /^https?:\/\/.+/i
      const validUrls = urls.filter(url => urlPattern.test(url.trim()))
      setValidUrlCount(validUrls.length)
    } catch (error) {
      console.error('URL validation error:', error)
      setValidUrlCount(0)
    }
  }, [])

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const textData = e.dataTransfer.getData('text')
    
    if (files.length > 0) {
      const droppedFile = files[0]
      if (droppedFile.type === 'text/plain' || 
          droppedFile.name.endsWith('.txt') || 
          droppedFile.name.endsWith('.html')) {
        setFile(droppedFile)
        setTextInput('')
        setValidUrlCount(0)
      } else {
        toast.error('Only .txt and .html files are supported')
      }
    } else if (textData) {
      setTextInput(textData)
      setFile(null)
      validateUrls(textData)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setTextInput('')
      setValidUrlCount(0)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setTextInput(newText)
    setFile(null)
    validateUrls(newText)
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!textInput.trim() && !file) {
      toast.error('Please paste URLs or select a file')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setProcessingMessage('Parsing URLs...')

    try {
      let tabs: any[] = []
      
      if (textInput.trim()) {
        tabs = await parseTabsFromText(textInput)
      } else if (file) {
        tabs = await parseTabsFromFile(file)
      }

      if (tabs.length === 0) {
        toast.error('No valid URLs found')
        setIsProcessing(false)
        return
      }

      setProcessingMessage(`Processing ${tabs.length} tabs...`)
      
      // Process in batches with progress updates
      const BATCH_SIZE = 10
      const totalBatches = Math.ceil(tabs.length / BATCH_SIZE)
      
      for (let i = 0; i < tabs.length; i += BATCH_SIZE) {
        const batch = tabs.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        
        setProcessingMessage(`Processing batch ${batchNumber}/${totalBatches}...`)
        
        await addTabs(batch)
        
        const progressPercent = Math.min(((i + BATCH_SIZE) / tabs.length) * 100, 100)
        setProgress(progressPercent)
        
        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Success
      toast.success(`Successfully imported ${tabs.length} tabs!`)
      setTextInput('')
      setFile(null)
      setValidUrlCount(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onImportComplete?.()
      
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import tabs')
    } finally {
      setIsProcessing(false)
      setProgress(0)
      setProcessingMessage('')
    }
  }

  const canImport = (textInput.trim() || file) && !isProcessing
  const hasValidInput = textInput.trim() ? validUrlCount > 0 : !!file

  return (
    <div className="space-y-6">
      {/* Main Import Area */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Tabs
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Drag & drop or paste your Safari tabs
                </h3>
                <p className="text-sm text-muted-foreground">
                  Supports text files, HTML files, or direct URL pasting
                </p>
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste your Safari tab URLs here, one per line..."
                  value={textInput}
                  onChange={handleTextChange}
                  disabled={isProcessing || !!file}
                  rows={isMobile ? 4 : 6}
                  className={`min-h-[100px] ${
                    textInput && validUrlCount === 0
                      ? 'border-destructive focus:border-destructive'
                      : textInput && validUrlCount > 0
                      ? 'border-green-500 focus:border-green-500'
                      : ''
                  }`}
                />
                
                {textInput && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {validUrlCount > 0 ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {validUrlCount} valid URL{validUrlCount !== 1 ? 's' : ''}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <Badge variant="destructive">
                            No valid URLs found
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-muted-foreground/25" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    or
                  </span>
                  <div className="flex-1 border-t border-muted-foreground/25" />
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || !!textInput.trim()}
                  className="touch-target-large"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Select File
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.html"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected File Display */}
              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {file.name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearFile}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!canImport || !hasValidInput}
            className="w-full touch-target-large"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {processingMessage}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Tabs
              </>
            )}
          </Button>

          {/* Progress Bar */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="w-full bg-muted rounded-full h-2">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {processingMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-center gap-2">
            <HelpCircle className="h-4 w-4" />
            {showHelp ? 'Hide Instructions' : 'How to Export Safari Tabs'}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Export Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-medium">iOS (iPhone/iPad)</h4>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Open Safari</li>
                        <li>Tap the tabs icon (bottom right)</li>
                        <li>Long press "X Tabs" at bottom</li>
                        <li>Select "Copy X Links"</li>
                        <li>Paste in the text area above</li>
                      </ol>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Monitor className="h-5 w-5 text-primary mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-medium">macOS</h4>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Open Safari</li>
                        <li>View → Show Tab Overview</li>
                        <li>Select tabs (⌘+click for multiple)</li>
                        <li>Right-click → "Copy Links"</li>
                        <li>Paste in the text area above</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-start gap-2">
                    <LinkIcon className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Alternative Methods</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Save links to a .txt file or export as HTML and upload using the file picker
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}