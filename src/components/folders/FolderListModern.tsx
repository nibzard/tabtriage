'use client'

import { motion } from 'framer-motion'
import { Folder } from '@/types/Folder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Folder as FolderIcon, 
  Search, 
  Trash2, 
  Archive,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FolderListModernProps {
  folders: Folder[]
  selectedFolderId: string
  onSelectFolder: (folderId: string) => void
  tabCounts: Record<string, number>
  onDeleteFolder?: () => void
  searchTerm?: string
  onSearchChange?: (term: string) => void
}

export function FolderListModern({ 
  folders, 
  selectedFolderId, 
  onSelectFolder, 
  tabCounts, 
  onDeleteFolder,
  searchTerm = '',
  onSearchChange
}: FolderListModernProps) {
  const totalTabs = Object.values(tabCounts).reduce((sum, count) => sum + count, 0)
  const unorganizedTabs = folders.length > 0 ? 0 : totalTabs

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderIcon className="h-5 w-5" />
          Folders
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Box */}
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in folder..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
        )}

        {/* Folder List */}
        <div className="space-y-2">
          {folders.map((folder, index) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFolderId === folder.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSelectFolder(folder.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: folder.color || '#4B5563' }}
                  />
                  <span className={`font-medium truncate ${
                    selectedFolderId === folder.id 
                      ? 'text-primary' 
                      : 'text-foreground'
                  }`}>
                    {folder.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={selectedFolderId === folder.id ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {tabCounts[folder.id] || 0}
                  </Badge>
                  
                  {onDeleteFolder && selectedFolderId === folder.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteFolder()
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Unorganized Section */}
          {unorganizedTabs > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: folders.length * 0.05 }}
            >
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedFolderId === ''
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSelectFolder('')}
              >
                <div className="flex items-center gap-3">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className={`font-medium ${
                    selectedFolderId === '' 
                      ? 'text-primary' 
                      : 'text-foreground'
                  }`}>
                    Unorganized
                  </span>
                </div>
                
                <Badge 
                  variant={selectedFolderId === '' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {unorganizedTabs}
                </Badge>
              </div>
            </motion.div>
          )}
        </div>

        {/* Empty State */}
        {folders.length === 0 && (
          <div className="text-center py-6 space-y-2">
            <FolderIcon className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No folders yet. Create one to organize your tabs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}