'use client'

import { useRef, useCallback, CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'framer-motion'
import { Tab } from '@/types/Tab'
import { TabCard } from './TabCard'

interface VirtualizedTabListProps {
  tabs: Tab[]
  selectedTabs: Set<string>
  expandedTabId: string | null
  onToggleExpand: (tabId: string) => void
  onToggleSelect: (tabId: string) => void
  onKeep: (tabId: string) => void
  onDiscard: (tabId: string) => void
  onAssignFolder: (tabId: string, folderId: string) => void
  onDeleteTab?: (tabId: string) => void
  showingDiscarded?: boolean
}

// Estimate row heights for better performance
const estimateRowHeight = (expanded: boolean) => expanded ? 500 : 350

export function VirtualizedTabList({
  tabs,
  selectedTabs,
  expandedTabId,
  onToggleExpand,
  onToggleSelect,
  onKeep,
  onDiscard,
  onAssignFolder,
  onDeleteTab,
  showingDiscarded = false,
}: VirtualizedTabListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  // Calculate column count based on viewport width
  // We'll implement a simple responsive grid
  const getColCount = () => {
    if (typeof window === 'undefined') return 1
    const width = window.innerWidth
    if (width < 640) return 1 // Mobile
    if (width < 1024) return 2 // Tablet
    if (width < 1536) return 3 // Medium desktop
    return 4 // Large desktop
  }
  
  const colCount = getColCount()

  // Group tabs into rows for the grid layout
  const rows: Tab[][] = []
  for (let i = 0; i < tabs.length; i += colCount) {
    rows.push(tabs.slice(i, i + colCount))
  }

  // Virtualize at the row level, not individual tab level
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const rowTabs = rows[index]
      const hasExpandedTab = rowTabs.some(tab => expandedTabId === tab.id)
      return estimateRowHeight(hasExpandedTab)
    },
    overscan: 5,
  })

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-220px)] md:h-[calc(100vh-190px)] overflow-auto"
      style={{
        paddingBottom: '80px', // Add padding for mobile nav
        paddingRight: '4px',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        <AnimatePresence>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowTabs = rows[virtualRow.index];
            
            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-1">
                  {rowTabs.map((tab) => (
                    <motion.div
                      key={tab.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <TabCard
                        tab={tab}
                        isExpanded={expandedTabId === tab.id}
                        isSelected={selectedTabs.has(tab.id)}
                        onToggleExpand={() => onToggleExpand(tab.id)}
                        onToggleSelect={() => onToggleSelect(tab.id)}
                        onKeep={() => onKeep(tab.id)}
                        onDiscard={showingDiscarded && onDeleteTab 
                          ? () => onDeleteTab(tab.id) 
                          : () => onDiscard(tab.id)}
                        onAssignFolder={(folderId) => onAssignFolder(tab.id, folderId)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}