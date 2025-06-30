'use client'

import { useState } from 'react'
import { Tab } from '@/types/Tab'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, ExternalLink } from 'lucide-react'

interface EditTabModalProps {
  tab: Tab
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<Tab>) => void
}

export function EditTabModal({ tab, isOpen, onClose, onSave }: EditTabModalProps) {
  const [title, setTitle] = useState(tab.title)
  const [url, setUrl] = useState(tab.url)
  const [summary, setSummary] = useState(tab.summary || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!url.trim()) {
      return
    }

    setIsLoading(true)
    
    try {
      // Validate URL format
      let validatedUrl = url.trim()
      if (!validatedUrl.startsWith('http://') && !validatedUrl.startsWith('https://')) {
        validatedUrl = `https://${validatedUrl}`
      }
      
      // Test if URL is valid
      new URL(validatedUrl)
      
      const updates: Partial<Tab> = {
        title: title.trim() || tab.title,
        url: validatedUrl,
        summary: summary.trim() || tab.summary,
        domain: new URL(validatedUrl).hostname.replace('www.', '')
      }
      
      await onSave(updates)
      onClose()
    } catch (error) {
      console.error('Invalid URL format')
      // You could add a toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Reset form to original values
    setTitle(tab.title)
    setUrl(tab.url)
    setSummary(tab.summary || '')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Tab
          </DialogTitle>
          <DialogDescription>
            Update the tab&apos;s information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter tab title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-url">URL</Label>
            <div className="flex gap-2">
              <Input
                id="edit-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                disabled={!url}
                className="shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-summary">Summary (Optional)</Label>
            <Textarea
              id="edit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the page content"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!url.trim() || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}