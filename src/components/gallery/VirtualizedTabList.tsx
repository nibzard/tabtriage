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
  
  // Dynamic row height calculation
  const estimateSize = useCallback(
    (index: number) => {
      const tab = tabs[index]
      return estimateRowHeight(expandedTabId === tab.id)
    },
    [tabs, expandedTabId]
  )
  
  const rowVirtualizer = useVirtualizer({
    count: tabs.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5,
  })
  
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
  
  // Group tabs into rows for the grid
  const groupedTabs = []
  for (let i = 0; i < tabs.length; i += colCount) {
    groupedTabs.push(tabs.slice(i, i + colCount))
  }
  
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
            const row = Math.floor(virtualRow.index / colCount)
            const rowTabs = tabs.slice(row * colCount, (row + 1) * colCount)
            
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
                      {/* Selection indicator (simplified) */}
                      {selectedTabs.has(tab.id) && (
                        <div className="absolute top-2 left-2 z-10 bg-primary-500 dark:bg-primary-600 w-6 h-6 flex items-center justify-center rounded-full shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Use click to select instead of checkbox */}
                      <div onClick={() => onToggleSelect(tab.id)} className="cursor-pointer">
                        <TabCard
                          tab={tab}
                          isExpanded={expandedTabId === tab.id}
                          onToggleExpand={() => onToggleExpand(tab.id)}
                          onKeep={() => onKeep(tab.id)}
                          onDiscard={showingDiscarded && onDeleteTab 
                            ? () => onDeleteTab(tab.id) 
                            : () => onDiscard(tab.id)}
                          onAssignFolder={(folderId) => onAssignFolder(tab.id, folderId)}
                        />
                      </div>
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