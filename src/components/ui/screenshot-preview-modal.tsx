"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close
const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-100 ring-offset-background transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-white dark:bg-gray-800 shadow-md p-1 border border-gray-200 dark:border-gray-600">
        <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

import { Tab } from "@/types/Tab"

interface ScreenshotPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  tab: Tab
}

export function ScreenshotPreviewModal({
  isOpen,
  onClose,
  tab
}: ScreenshotPreviewModalProps) {
  const [showFullHeight, setShowFullHeight] = React.useState(false)
  const isValidUrl = (url?: string) => url && (url.startsWith('http') || url.startsWith('data:'));
  
  if (!tab) {
    return null
  }
  
  const hasFullScreenshot = isValidUrl(tab.fullScreenshot)
  const previewUrl = (showFullHeight && hasFullScreenshot) ? tab.fullScreenshot : (tab.thumbnail || tab.screenshot)
  const isShowingFullHeight = showFullHeight && hasFullScreenshot
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogTitle className="sr-only">{tab.title || 'Screenshot Preview'}</DialogTitle>
        <DialogDescription className="sr-only">A preview of the screenshot for the tab: {tab.title}</DialogDescription>
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {tab.title || 'Screenshot Preview'}
            </h2>
            <a 
              href={tab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 block truncate"
            >
              {tab.url}
            </a>
          </div>
          
          <div className="relative w-full max-h-[70vh] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto">
            {previewUrl && isValidUrl(previewUrl) ? (
              previewUrl.startsWith('data:') ? (
                <img 
                  src={previewUrl} 
                  alt={tab.title}
                  className={`w-full ${isShowingFullHeight ? 'h-auto' : 'h-full object-contain'}`}
                  onError={() => {
                    console.error(`Failed to load data URL image in preview`)
                  }}
                />
              ) : (
                <div className="relative w-full min-h-[400px]">
                  <Image
                    src={previewUrl}
                    alt={tab.title}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className={`w-full ${isShowingFullHeight ? 'h-auto' : 'h-full object-contain'}`}
                    priority
                    onError={() => {
                      console.error(`Failed to load image in preview: ${previewUrl}`)
                    }}
                  />
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Image not available</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {isShowingFullHeight ? 'Showing full-height screenshot' : 'Showing thumbnail screenshot'}
              </div>
              {hasFullScreenshot && (
                <button
                  onClick={() => setShowFullHeight(!showFullHeight)}
                  className="text-xs px-3 py-1 rounded-full border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {isShowingFullHeight ? 'Show Thumbnail' : 'Show Full Screenshot'}
                </button>
              )}
              {isShowingFullHeight && (
                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                  Full Height
                </span>
              )}
            </div>
            <a
              href={tab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Open Page
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { Dialog, DialogTrigger, DialogContent, DialogOverlay, DialogClose, DialogTitle, DialogDescription }
