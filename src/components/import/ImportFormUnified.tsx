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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTabs } from '@/hooks/useTabs'
import { parseTabsFromText, parseTabsFromFile } from '@/services/tabService'
import { useResponsive } from '@/hooks/useUI'
import { UrlSanitizationSettings } from './UrlSanitizationSettings'

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
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false)
  const [duplicateResolution, setDuplicateResolution] = useState<any>({})
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([])
  const [tabsToImport, setTabsToImport] = useState<any[]>([])
  const [backgroundBatchId, setBackgroundBatchId] = useState<string | null>(null)
  const [backgroundProgress, setBackgroundProgress] = useState(0)
  const [backgroundMessage, setBackgroundMessage] = useState('')
  const [urlSanitizationEnabled, setUrlSanitizationEnabled] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refetch } = useTabs()
  const { isMobile } = useResponsive()

  // Track background processing
  const trackBackgroundProcessing = async (batchId: string, totalTabs: number) => {
    setBackgroundBatchId(batchId)
    setBackgroundProgress(0)
    setBackgroundMessage('Processing screenshots and AI analysis...')
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tabs/import-status?batchId=${batchId}`)
        if (response.ok) {
          const status = await response.json()
          
          setBackgroundProgress(status.progress)
          
          if (status.status === 'completed') {
            setBackgroundMessage('Processing complete!')
            clearInterval(pollInterval)
            setTimeout(() => {
              setBackgroundBatchId(null)
              setBackgroundProgress(0)
              setBackgroundMessage('')
              refetch() // Refresh the tabs list
            }, 2000)
          } else if (status.status === 'failed') {
            setBackgroundMessage('Some processing failed, but tabs were imported')
            clearInterval(pollInterval)
            setTimeout(() => {
              setBackgroundBatchId(null)
              setBackgroundProgress(0)
              setBackgroundMessage('')
              refetch()
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Failed to poll import status:', error)
      }
    }, 2000) // Poll every 2 seconds
    
    // Stop polling after 10 minutes max
    setTimeout(() => {
      clearInterval(pollInterval)
      if (backgroundBatchId === batchId) {
        setBackgroundBatchId(null)
        setBackgroundProgress(0)
        setBackgroundMessage('')
      }
    }, 600000)
  }

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

  const handleDuplicateResolution = async (action: 'skip' | 'overwrite' | 'new') => {
    setShowDuplicatesDialog(false);

    const tabsToProcess = [...tabsToImport];

    const finalTabs = tabsToProcess.filter(tab => {
      const duplicate = duplicates.find(d => d.url === tab.url);
      if (duplicate) {
        const resolution = duplicateResolution[duplicate.id] || action;
        return resolution === 'new';
      }
      return true;
    });

    const tabsToOverwrite = tabsToProcess.filter(tab => {
      const duplicate = duplicates.find(d => d.url === tab.url);
      if (duplicate) {
        const resolution = duplicateResolution[duplicate.id] || action;
        return resolution === 'overwrite';
      }
      return false;
    });

    if (finalTabs.length > 0) {
      await importTabs(finalTabs);
    }

    if (tabsToOverwrite.length > 0) {
      const existingTabsToOverwrite = duplicates.filter(d =>
        tabsToOverwrite.some(t => t.url === d.url)
      );
      const updatedTabs = existingTabsToOverwrite.map(existingTab => {
        const newTab = tabsToOverwrite.find(t => t.url === existingTab.url);
        return { ...existingTab, ...newTab };
      });
      await importTabs(updatedTabs);
    }

    setDuplicates([]);
    setDuplicateResolution({});
    setSelectedDuplicates([]);
    setTabsToImport([]);
    setTextInput('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImportComplete?.();
  };

  const importTabs = async (tabs: any[]) => {
    setIsProcessing(true);
    setProcessingMessage(`Importing ${tabs.length} tabs...`);
    setProgress(0);

    try {
      // Use the new batch import API
      const response = await fetch('/api/tabs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tabs,
          skipDuplicates: true,
          sanitizeUrls: urlSanitizationEnabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      const { successful, failed, importBatchId } = result;

      // Show immediate results
      setProgress(100);
      
      if (successful.length > 0) {
        toast.success(`Successfully imported ${successful.length} tabs!`);
        
        // Start tracking background processing
        trackBackgroundProcessing(importBatchId, successful.length);
      }
      
      if (failed.length > 0) {
        toast.error(`Failed to import ${failed.length} tabs`);
        console.error('Failed tabs:', failed);
      }

      // Clear form
      setTextInput('');
      setFile(null);
      setValidUrlCount(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onImportComplete?.();
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import tabs');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProcessingMessage('');
    }
  };

  const handleImport = async () => {
    if (!textInput.trim() && !file) {
      toast.error('Please paste URLs or select a file');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Parsing URLs...');

    try {
      let tabs: any[] = [];
      try {
        if (textInput.trim()) {
          tabs = await parseTabsFromText(textInput);
        } else if (file) {
          tabs = await parseTabsFromFile(file);
        }
      } catch (error) {
        toast.error(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsProcessing(false);
        return;
      }

      if (tabs.length === 0) {
        toast.error('No valid URLs found');
        setIsProcessing(false);
        return;
      }

      const urls = tabs.map(tab => tab.url);
      const response = await fetch('/api/tabs/check-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      });

      const { existingTabs } = await response.json();

      if (existingTabs.length > 0) {
        setTabsToImport(tabs);
        setDuplicates(existingTabs);
        setShowDuplicatesDialog(true);
        setIsProcessing(false);
        return;
      }

      await importTabs(tabs);
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import tabs');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProcessingMessage('');
    }
  };

  const canImport = (textInput.trim() || file) && !isProcessing
  const hasValidInput = textInput.trim() ? validUrlCount > 0 : !!file

  return (
    <div className="space-y-6">
      <Dialog open={showDuplicatesDialog} onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Duplicate Tabs Found</DialogTitle>
            <DialogDescription>
              The following tabs already exist in your collection. Choose how to handle them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedDuplicates.length === duplicates.length}
                  onCheckedChange={checked => {
                    if (checked) {
                      setSelectedDuplicates(duplicates.map(d => d.id));
                    } else {
                      setSelectedDuplicates([]);
                    }
                  }}
                />
                <label htmlFor="select-all">Select All</label>
              </div>
              <Select
                onValueChange={value => {
                  const newResolution = { ...duplicateResolution };
                  selectedDuplicates.forEach(id => {
                    newResolution[id] = value;
                  });
                  setDuplicateResolution(newResolution);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Bulk Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip</SelectItem>
                  <SelectItem value="overwrite">Overwrite</SelectItem>
                  <SelectItem value="new">Add as New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-4">
              {duplicates.map(tab => (
                <div key={tab.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={tab.id}
                      checked={selectedDuplicates.includes(tab.id)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setSelectedDuplicates([...selectedDuplicates, tab.id]);
                        } else {
                          setSelectedDuplicates(selectedDuplicates.filter(id => id !== tab.id));
                        }
                      }}
                    />
                    <label htmlFor={tab.id} className="truncate">
                      {tab.title}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={duplicateResolution[tab.id] || 'skip'}
                      onValueChange={value =>
                        setDuplicateResolution({ ...duplicateResolution, [tab.id]: value })
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip</SelectItem>
                        <SelectItem value="overwrite">Overwrite</SelectItem>
                        <SelectItem value="new">Add as New</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicatesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleDuplicateResolution('skip')}>Import Only New</Button>
            <Button onClick={() => handleDuplicateResolution('new')}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                  Drag & drop, paste, or select a file
                </h3>
                <p className="text-sm text-muted-foreground">
                  Supports any file type with links in it. <a href="/demo-links.txt" download className="underline">Download demo file</a>
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

          {/* Background Processing Progress */}
          <AnimatePresence>
            {backgroundBatchId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-blue-800">
                      Background Processing
                    </span>
                  </div>
                  <span className="text-xs text-blue-600">
                    {backgroundProgress}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${backgroundProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-blue-700">
                  {backgroundMessage}
                </p>
                <p className="text-xs text-blue-600">
                  Your tabs have been imported and are being processed in the background.
                  You can continue using the app while this completes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* URL Sanitization Settings */}
      <UrlSanitizationSettings
        enabled={urlSanitizationEnabled}
        onToggle={setUrlSanitizationEnabled}
      />

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
                        <li>Long press &quot;X Tabs&quot; at bottom</li>
                        <li>Select &quot;Copy X Links&quot;</li>
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
                        <li>Right-click → &quot;Copy Links&quot;</li>
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