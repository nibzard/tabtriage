'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { motion, PanInfo, useAnimation } from 'framer-motion'
import { Heart, Trash2, Folder, MoreVertical, Check, X, ExternalLink, FolderPlus, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useTabs } from '@/hooks/useTabs'
import { useBulkActions } from '@/hooks/useUI'
import { useFoldersContextSafe } from '@/context/FoldersContext'
import { Tab } from '@/types/Tab'
import { logger } from '@/utils/logger'
import { HighlightedText, SearchSnippet } from '@/components/ui/HighlightedText'
import { ScreenshotPreviewModal } from '@/components/ui/screenshot-preview-modal'

interface TabCardProps {
  tab: Tab
  isSelected?: boolean
  onToggleSelect?: () => void
  onKeep?: (tabId: string) => void
  onDiscard?: (tabId: string) => void
  onDelete?: (tabId: string) => void
  onAssignToFolder?: (tabId: string, folderId: string) => void
  onCreateFolderAndAssign?: (tabId: string, folderName: string) => void
  onDragStart?: (tab: Tab) => void
  onDragEnd?: () => void
  showActions?: boolean
  searchTerm?: string
  thumbnailSize?: 'small' | 'medium' | 'large' | 'list'
}

const TabCard = memo(function TabCard({ 
  tab, 
  isSelected: propIsSelected,
  onToggleSelect,
  onKeep, 
  onDiscard,
  onDelete,
  onAssignToFolder, 
  onCreateFolderAndAssign,
  onDragStart,
  onDragEnd,
  showActions = true,
  searchTerm = '',
  thumbnailSize = 'medium'
}: TabCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const controls = useAnimation()
  const constraintsRef = useRef(null)
  
  const { keepTab, discardTab, deleteTab } = useTabs()
  const { isTabSelected, toggleTabSelection } = useBulkActions()
  const { folders, createFolder } = useFoldersContextSafe()
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const isSelected = propIsSelected ?? isTabSelected(tab.id)
  const handleToggleSelect = onToggleSelect || (() => toggleTabSelection(tab.id))
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const handleSwipeDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100
    const velocity = info.velocity.x
    const offset = info.offset.x

    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      if (offset > 0) {
        handleKeep()
      } else {
        handleDiscard()
      }
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } })
      setDragDirection(null)
    }
  }

  const handleSwipeDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x
    if (Math.abs(offset) > 20) {
      setDragDirection(offset > 0 ? 'right' : 'left')
    } else {
      setDragDirection(null)
    }
  }

  const handleKeep = () => onKeep ? onKeep(tab.id) : keepTab(tab.id)
  const handleDiscard = () => onDiscard ? onDiscard(tab.id) : discardTab(tab.id)
  const handleDelete = () => onDelete ? onDelete(tab.id) : deleteTab(tab.id)
  const handleCardTap = () => setIsExpanded(!isExpanded)
  const handleFolderAssign = (folderId: string) => onAssignToFolder && onAssignToFolder(tab.id, folderId)
  
  const handleCreateFolderAndAssign = async () => {
    if (newFolderName.trim() && onCreateFolderAndAssign) {
      onCreateFolderAndAssign(tab.id, newFolderName.trim())
      setNewFolderName('')
      setIsCreatingFolder(false)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/tabs/${tab.id}/regenerate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate tab data')
      }

      const result = await response.json()
      logger.info('Tab data regenerated successfully', result)
      
      // Update the tab's screenshot in place without page refresh
      if (result.tab && result.screenshots) {
        // Find the screenshot image and update its src with the new thumbnail
        const screenshotElement = document.querySelector(`img[data-tab-screenshot="${tab.id}"]`)
        if (screenshotElement && result.screenshots.thumbnail) {
          screenshotElement.src = result.screenshots.thumbnail
        }
      }
    } catch (error) {
      logger.error('Error regenerating tab data:', error)
      // You could add a toast notification here
    } finally {
      setIsRegenerating(false)
    }
  }

  // List view renders a different compact layout
  if (thumbnailSize === 'list') {
    return (
      <div className="relative" ref={constraintsRef}>
        <motion.div
          drag="x"
          dragConstraints={constraintsRef}
          dragElastic={0.2}
          onDrag={handleSwipeDrag}
          onDragEnd={(event, info) => {
            handleSwipeDragEnd(event, info)
            onDragEnd?.()
          }}
          onDragStart={() => onDragStart?.(tab)}
          animate={controls}
          whileDrag={{ scale: 1.02 }}
          className="relative z-10"
          draggable={true}
        >
          <Card 
            className={`transition-all duration-200 ${
              isSelected ? 'ring-2 ring-primary' : ''
            } cursor-pointer`}
            onClick={handleCardTap}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left side: Selection checkbox, title, domain */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleSelect()
                    }}
                    className={`touch-target-large rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'border-muted-foreground/30 hover:border-primary'
                    }`}
                    style={{ minWidth: '20px', minHeight: '20px' }}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1 text-foreground">
                      <HighlightedText text={tab.title} searchTerm={searchTerm} />
                    </h3>
                    <p className="text-muted-foreground text-xs truncate">
                      <HighlightedText text={tab.domain || ''} searchTerm={searchTerm} />
                    </p>
                  </div>
                </div>

                {/* Right side: Actions */}
                {showActions && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleKeep() }} className="touch-target h-8 px-3">
                      <Heart className="h-3 w-3 mr-1" />
                      Keep
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDiscard() }} className="touch-target h-8 px-3">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Discard
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={(e) => e.stopPropagation()} 
                          className="touch-target h-8 px-3"
                        >
                          <Folder className="h-3 w-3 mr-1" />
                          Folder
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {folders.length > 0 ? (
                          folders.map(folder => (
                            <DropdownMenuItem key={folder.id} onClick={(e) => { e.stopPropagation(); handleFolderAssign(folder.id) }}>
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: folder.color || '#4B5563' }} />
                              {folder.name}
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No folders available</DropdownMenuItem>
                        )}
                        {onCreateFolderAndAssign && (
                          <>
                            {folders.length > 0 && <DropdownMenuSeparator />}
                            {!isCreatingFolder ? (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsCreatingFolder(true) }}>
                                <FolderPlus className="h-4 w-4 mr-2" />
                                Create New Folder
                              </DropdownMenuItem>
                            ) : (
                              <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <input type="text" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolderAndAssign(); if (e.key === 'Escape') setIsCreatingFolder(false) }} className="w-full px-2 py-1 text-sm border rounded" autoFocus />
                                <div className="flex gap-1">
                                  <button onClick={handleCreateFolderAndAssign} disabled={!newFolderName.trim()} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50">Create</button>
                                  <button onClick={() => setIsCreatingFolder(false)} className="px-2 py-1 text-xs border rounded">Cancel</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="touch-target h-8 w-8 shrink-0 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={tab.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Tab
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleRegenerate() }}
                          disabled={isRegenerating}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                          {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleKeep() }}>
                          <Heart className="h-4 w-4 mr-2" />
                          Keep
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDiscard() }}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Discard
                        </DropdownMenuItem>
                        {onDelete && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete() }} className="text-destructive focus:text-destructive">
                            <X className="h-4 w-4 mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Expanded content for list view */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  {tab.summary && (
                    <div className="text-sm text-muted-foreground leading-5 mb-3">
                      {searchTerm ? (
                        <SearchSnippet text={tab.summary} searchTerm={searchTerm} maxLength={300} />
                      ) : (
                        tab.summary
                      )}
                    </div>
                  )}
                  
                  {tab.tags && tab.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tab.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview modal for list view */}
        {(tab.screenshot || tab.thumbnail) && (
          <ScreenshotPreviewModal 
            isOpen={isPreviewOpen} 
            onClose={() => setIsPreviewOpen(false)} 
            screenshotUrl={tab.screenshot || tab.thumbnail || ''} 
            fullScreenshotUrl={tab.fullScreenshot} 
            title={tab.title || 'Untitled'} 
            url={tab.url} 
          />
        )}
      </div>
    )
  }

  // Default card view for other thumbnail sizes
  return (
    <div className="relative" ref={constraintsRef}>

      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        onDrag={handleSwipeDrag}
        onDragEnd={(event, info) => {
          handleSwipeDragEnd(event, info)
          onDragEnd?.()
        }}
        onDragStart={() => onDragStart?.(tab)}
        animate={controls}
        whileDrag={{ scale: 1.02 }}
        className="relative z-10"
        draggable={true}
      >
        <Card 
          className={`transition-all duration-200 ${
            isSelected ? 'ring-2 ring-primary' : ''
          } ${isExpanded ? 'mb-2' : ''} cursor-pointer`}
          onClick={handleCardTap}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleSelect()
                }}
                className={`touch-target-large rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground/30 hover:border-primary'
                }`}
                style={{ minWidth: '24px', minHeight: '24px' }}
              >
                {isSelected && <Check className="h-4 w-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium leading-5 line-clamp-2 text-foreground text-sm">
                  <HighlightedText text={tab.title} searchTerm={searchTerm} />
                </h3>
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  <HighlightedText text={tab.domain || ''} searchTerm={searchTerm} />
                </p>
              </div>

              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target shrink-0 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={tab.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Tab
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); handleRegenerate() }}
                      disabled={isRegenerating}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                      {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleKeep() }}>
                      <Heart className="h-4 w-4 mr-2" />
                      Keep
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDiscard() }}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Discard
                    </DropdownMenuItem>
                    {onDelete && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete() }} className="text-destructive focus:text-destructive">
                        <X className="h-4 w-4 mr-2" />
                        Delete Permanently
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {(tab.thumbnail || tab.screenshot) && (
              <div 
                className="rounded-lg overflow-hidden bg-muted cursor-pointer group relative mb-3"
                onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true) }}
              >
                <img 
                  src={tab.thumbnail || tab.screenshot} 
                  alt={tab.title} 
                  className={`w-full object-cover transition-transform group-hover:scale-105 ${
                    thumbnailSize === 'small' ? 'h-32' :
                    thumbnailSize === 'large' ? 'h-80' : 'h-56'
                  }`}
                  loading="lazy" 
                  data-tab-screenshot={tab.id} 
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg backdrop-blur-sm">
                    <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">Click to preview</span>
                  </div>
                </div>
              </div>
            )}

            {tab.summary && (
              <div className={`text-sm text-muted-foreground leading-5 ${isExpanded ? '' : 'line-clamp-2'}`}>
                {searchTerm ? (
                  <SearchSnippet text={tab.summary} searchTerm={searchTerm} maxLength={isExpanded ? 500 : 150} className={`text-sm text-muted-foreground leading-5 ${isExpanded ? '' : 'line-clamp-2'}`} />
                ) : (
                  tab.summary
                )}
              </div>
            )}

            {tab.tags && tab.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {tab.tags.slice(0, isExpanded ? undefined : 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
                {!isExpanded && tab.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{tab.tags.length - 3} more</span>
                )}
              </div>
            )}

            {showActions && (
              <div className={`mt-4 pt-4 border-t border-border ${
                isClient && thumbnailSize === 'large' 
                  ? 'flex items-center justify-between' 
                  : 'flex flex-col space-y-2'
              }`}>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleKeep() }} className="touch-target">
                    <Heart className="h-4 w-4 mr-1" />
                    Keep
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDiscard() }} className="touch-target">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Discard
                  </Button>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => e.stopPropagation()} 
                      className={`touch-target ${(!isClient || thumbnailSize !== 'large') ? 'w-full justify-start' : ''}`}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Assign to Folder
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {folders.length > 0 ? (
                      folders.map(folder => (
                        <DropdownMenuItem key={folder.id} onClick={(e) => { e.stopPropagation(); handleFolderAssign(folder.id) }}>
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: folder.color || '#4B5563' }} />
                          {folder.name}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No folders available</DropdownMenuItem>
                    )}
                    {onCreateFolderAndAssign && (
                      <>
                        {folders.length > 0 && <DropdownMenuSeparator />}
                        {!isCreatingFolder ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsCreatingFolder(true) }}>
                            <FolderPlus className="h-4 w-4 mr-2" />
                            Create New Folder
                          </DropdownMenuItem>
                        ) : (
                          <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <input type="text" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolderAndAssign(); if (e.key === 'Escape') setIsCreatingFolder(false) }} className="w-full px-2 py-1 text-sm border rounded" autoFocus />
                            <div className="flex gap-1">
                              <button onClick={handleCreateFolderAndAssign} disabled={!newFolderName.trim()} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50">Create</button>
                              <button onClick={() => setIsCreatingFolder(false)} className="px-2 py-1 text-xs border rounded">Cancel</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {(tab.screenshot || tab.thumbnail) && (
        <ScreenshotPreviewModal 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
          tab={tab}
        />
      )}
    </div>
  )
})

export { TabCard }
