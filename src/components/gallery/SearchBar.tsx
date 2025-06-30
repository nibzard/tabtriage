import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Clock, Zap, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Simple debounce implementation
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialQuery?: string;
  onSearchWeightChange?: (value: number) => void;
  isSearching?: boolean;
  searchResultsCount?: number;
  searchMode?: 'keyword' | 'hybrid' | 'semantic' | 'none';
  searchWeight?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = 'Search tabs...', 
  initialQuery = '',
  onSearchWeightChange,
  isSearching = false,
  searchResultsCount = 0,
  searchMode = 'none',
  searchWeight = 1
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);

  // Debounce the search to avoid too many requests
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      onSearch(searchQuery);
      
      // Update URL with search param
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (searchQuery) {
        params.set('q', searchQuery);
      } else {
        params.delete('q');
      }
      
      // Replace the URL without refreshing the page
      router.replace(`?${params.toString()}`);
    }, 300),
    [onSearch, router, searchParams]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    debouncedSearch('');
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowAdvanced(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the focus is moving to the advanced controls
    if (advancedRef.current && advancedRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    // Delay hiding advanced controls to allow for clicks
    setTimeout(() => {
      if (!advancedRef.current?.matches(':hover')) {
        setShowAdvanced(false);
      }
    }, 150);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <Card className={`transition-all duration-200 ${isFocused ? 'ring-2 ring-primary shadow-lg' : 'shadow-sm'}`}>
        <CardContent className="p-0">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="w-full px-4 py-3 pl-12 pr-12 bg-transparent border-none rounded-lg focus:outline-none text-sm"
            />
            
            {/* Search Icon */}
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              {isSearching ? (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Clear Button */}
            {query && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Search Results Summary */}
          {query && !isSearching && (
            <div className="px-4 pb-3 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {searchResultsCount > 0 ? (
                    <span>Found {searchResultsCount} results</span>
                  ) : (
                    <span>No results found</span>
                  )}
                  
                  {searchMode === 'hybrid' && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Hybrid
                    </Badge>
                  )}
                  
                  {searchMode === 'keyword' && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Keyword
                    </Badge>
                  )}
                  
                  {searchMode === 'semantic' && (
                    <Badge variant="default" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Semantic
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs">
                  Press Enter to search
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Search Controls */}
      {showAdvanced && (
        <Card 
          ref={advancedRef}
          className="mt-2 border-dashed"
          onMouseLeave={() => {
            if (!isFocused) {
              setTimeout(() => setShowAdvanced(false), 100);
            }
          }}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Search Mode:</span>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  value={searchWeight} 
                  className="w-24 accent-primary"
                  title="Adjust balance between keyword and semantic search"
                  onChange={(e) => onSearchWeightChange?.(parseFloat(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Keyword</span>
                <span>Hybrid</span>
                <span>Semantic</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;