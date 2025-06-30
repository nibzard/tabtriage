'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder } from '@/types/Folder'
import { Tab } from '@/types/Tab'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  SortAsc, 
  ExternalLink, 
  Trash2, 
  Archive,
  Calendar,
  Globe,
  Hash,
  MoreVertical
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FolderContentModernProps {
  folder?: Folder
  tabs: Tab[]
  onDiscardTab: (tabId: string) => void
  onDeleteTab: (tabId: string) => void
}

export function FolderContentModern({ 
  folder, 
  tabs, 
  onDiscardTab, 
  onDeleteTab 
}: FolderContentModernProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date')

  // Filter and sort tabs
  const processedTabs = useMemo(() => {
    // Filter by search query
    let filtered = tabs.filter(tab =>
      tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    // Sort tabs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'domain':
          return a.domain.localeCompare(b.domain)
        default:
          return 0
      }
    })

    return filtered
  }, [tabs, searchQuery, sortBy])

  // Empty state
  if (tabs.length === 0) {
    return (
      <Card className="p-8">
        <CardContent className="text-center space-y-4">
          <div className="p-8 bg-muted/30 rounded-full w-fit mx-auto">
            <Archive className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              No tabs in this folder
            </h3>
            <p className="text-muted-foreground">
              {folder 
                ? `Assign tabs to "${folder.name}" to see them here.`
                : 'Assign tabs to a folder to organize them.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Folder Title */}
          <CardTitle className="flex items-center gap-2">
            {folder && (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: folder.color || '#4B5563' }}
              />
            )}
            <span className="text-xl">
              {folder ? folder.name : 'Unorganized Tabs'}
            </span>
            <Badge variant="outline" className="ml-2">
              {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tabs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 touch-target sm:w-64"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="touch-target sm:w-40">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </div>
                </SelectItem>
                <SelectItem value="title">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Title
                  </div>
                </SelectItem>
                <SelectItem value="domain">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Domain
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* No search results */}
        {processedTabs.length === 0 && searchQuery ? (
          <div className="text-center py-8 space-y-2">
            <Search className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              No tabs match &quot;{searchQuery}&quot;
            </p>
            <Button 
              variant="ghost" 
              onClick={() => setSearchQuery('')}
              className="touch-target"
            >
              Clear search
            </Button>
          </div>
        ) : (
          /* Tab List */
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {processedTabs.map((tab, index) => (
                <motion.div
                  key={tab.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="group"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Tab Screenshot */}
                        {tab.screenshot && (
                          <div className="sm:w-32 h-24 sm:h-20 overflow-hidden bg-muted rounded-lg flex-shrink-0">
                            <img
                              src={tab.screenshot}
                              alt={tab.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        
                        {/* Tab Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground line-clamp-2">
                                {tab.title}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {tab.domain}
                              </p>
                            </div>
                            
                            {/* Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a
                                    href={tab.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open Tab
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDiscardTab(tab.id)}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Move to Discarded
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteTab(tab.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Tab Summary */}
                          {tab.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {tab.summary}
                            </p>
                          )}
                          
                          {/* Tags */}
                          {tab.tags && tab.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tab.tags.slice(0, 3).map(tag => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {tab.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{tab.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Quick Actions */}
                          <div className="flex items-center justify-between pt-2">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="touch-target"
                            >
                              <a
                                href={tab.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open
                              </a>
                            </Button>
                            
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDiscardTab(tab.id)}
                                className="touch-target text-muted-foreground hover:text-yellow-600"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteTab(tab.id)}
                                className="touch-target text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}