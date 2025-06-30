'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Folder, 
  Tag,
  Calendar,
  Clock,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFolders } from '@/hooks/useFolders'
import { Tab } from '@/types/Tab'

interface SearchFilterPanelProps {
  tabs: Tab[]
  activeFilters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  searchTerm: string
  isVisible?: boolean
  onToggle?: () => void
}

export interface SearchFilters {
  status: string[]
  category: string[]
  folder: string[]
  dateRange: 'all' | 'today' | 'week' | 'month'
}

export function SearchFilterPanel({
  tabs,
  activeFilters,
  onFiltersChange,
  searchTerm,
  isVisible = false,
  onToggle
}: SearchFilterPanelProps) {
  const { folders } = useFolders()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['status']))

  // Calculate filter counts
  const filterCounts = calculateFilterCounts(tabs)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const updateFilter = (type: keyof SearchFilters, values: string[] | string) => {
    const newFilters = { ...activeFilters }
    if (type === 'dateRange') {
      newFilters[type] = values as string
    } else {
      newFilters[type] = Array.isArray(values) ? values : [values]
    }
    onFiltersChange(newFilters)
  }

  const toggleFilterValue = (type: keyof SearchFilters, value: string) => {
    if (type === 'dateRange') {
      updateFilter(type, value)
      return
    }

    const currentValues = activeFilters[type] as string[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    
    updateFilter(type, newValues)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      category: [],
      folder: [],
      dateRange: 'all'
    })
  }

  const getActiveFilterCount = () => {
    return (
      activeFilters.status.length +
      activeFilters.category.length +
      activeFilters.folder.length +
      (activeFilters.dateRange !== 'all' ? 1 : 0)
    )
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="relative"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {getActiveFilterCount() > 0 && (
          <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
            {getActiveFilterCount()}
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-dashed">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <h3 className="font-medium">Search Filters</h3>
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary">{getActiveFilterCount()}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getActiveFilterCount() > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onToggle}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Context */}
          {searchTerm && (
            <div className="mb-4 p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                Filtering results for: <span className="font-medium">&quot;{searchTerm}&quot;</span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Status Filter */}
            <FilterSection
              title="Status"
              icon={<Clock className="h-4 w-4" />}
              isExpanded={expandedSections.has('status')}
              onToggle={() => toggleSection('status')}
            >
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(option => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    count={filterCounts.status[option.value] || 0}
                    isSelected={activeFilters.status.includes(option.value)}
                    onClick={() => toggleFilterValue('status', option.value)}
                    color={option.color}
                  />
                ))}
              </div>
            </FilterSection>

            {/* Category Filter */}
            <FilterSection
              title="Category"
              icon={<Tag className="h-4 w-4" />}
              isExpanded={expandedSections.has('category')}
              onToggle={() => toggleSection('category')}
            >
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map(option => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    count={filterCounts.category[option.value] || 0}
                    isSelected={activeFilters.category.includes(option.value)}
                    onClick={() => toggleFilterValue('category', option.value)}
                    disabled={!filterCounts.category[option.value]}
                  />
                ))}
              </div>
            </FilterSection>

            {/* Folder Filter */}
            {folders.length > 0 && (
              <FilterSection
                title="Folders"
                icon={<Folder className="h-4 w-4" />}
                isExpanded={expandedSections.has('folders')}
                onToggle={() => toggleSection('folders')}
              >
                <div className="space-y-2">
                  <FilterChip
                    label="Unorganized"
                    count={filterCounts.folder['unorganized'] || 0}
                    isSelected={activeFilters.folder.includes('unorganized')}
                    onClick={() => toggleFilterValue('folder', 'unorganized')}
                  />
                  {folders.map(folder => (
                    <FilterChip
                      key={folder.id}
                      label={folder.name}
                      count={filterCounts.folder[folder.id] || 0}
                      isSelected={activeFilters.folder.includes(folder.id)}
                      onClick={() => toggleFilterValue('folder', folder.id)}
                      color={folder.color}
                      disabled={!filterCounts.folder[folder.id]}
                    />
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Date Range Filter */}
            <FilterSection
              title="Date Added"
              icon={<Calendar className="h-4 w-4" />}
              isExpanded={expandedSections.has('date')}
              onToggle={() => toggleSection('date')}
            >
              <div className="grid grid-cols-2 gap-2">
                {DATE_RANGE_OPTIONS.map(option => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    isSelected={activeFilters.dateRange === option.value}
                    onClick={() => toggleFilterValue('dateRange', option.value)}
                  />
                ))}
              </div>
            </FilterSection>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Filter Section Component
interface FilterSectionProps {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function FilterSection({ title, icon, isExpanded, onToggle, children }: FilterSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-2 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Filter Chip Component
interface FilterChipProps {
  label: string
  count?: number
  isSelected: boolean
  onClick: () => void
  color?: string
  disabled?: boolean
}

function FilterChip({ label, count, isSelected, onClick, color, disabled }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-between p-2 rounded-md text-sm transition-colors
        ${isSelected 
          ? 'bg-primary text-primary-foreground' 
          : disabled
            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
            : 'bg-muted hover:bg-muted/80'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {color && (
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
        )}
        <span className="truncate">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <Badge variant={isSelected ? "secondary" : "outline"} className="text-xs">
          {count}
        </Badge>
      )}
    </button>
  )
}

// Helper function to calculate filter counts
function calculateFilterCounts(tabs: Tab[]) {
  const counts = {
    status: {} as Record<string, number>,
    category: {} as Record<string, number>,
    folder: {} as Record<string, number>
  }

  tabs.forEach(tab => {
    // Status counts
    const status = tab.status || 'unprocessed'
    counts.status[status] = (counts.status[status] || 0) + 1

    // Category counts
    const category = tab.category || 'uncategorized'
    counts.category[category] = (counts.category[category] || 0) + 1

    // Folder counts
    const folderId = tab.folderId || 'unorganized'
    counts.folder[folderId] = (counts.folder[folderId] || 0) + 1
  })

  return counts
}

// Filter options
const STATUS_OPTIONS = [
  { value: 'unprocessed', label: 'Unprocessed', color: '#6b7280' },
  { value: 'kept', label: 'Kept', color: '#22c55e' },
  { value: 'discarded', label: 'Discarded', color: '#ef4444' },
  { value: 'archived', label: 'Archived', color: '#8b5cf6' }
]

const CATEGORY_OPTIONS = [
  { value: 'news', label: 'News' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'reference', label: 'Reference' },
  { value: 'social', label: 'Social Media' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'work', label: 'Work' },
  { value: 'research', label: 'Research' },
  { value: 'uncategorized', label: 'Uncategorized' }
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }
]