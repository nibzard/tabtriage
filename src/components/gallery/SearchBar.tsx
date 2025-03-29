import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { debounce } from 'lodash';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialQuery?: string;
  onSearchWeightChange?: (value: number) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = 'Search tabs...', 
  initialQuery = '',
  onSearchWeightChange
}) => {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Debounce the search to avoid too many requests
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      onSearch(searchQuery);
      
      // Update URL with search param
      const params = new URLSearchParams(searchParams.toString());
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

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
        {query && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center text-sm text-gray-500">
        <div className="flex items-center space-x-2">
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1" 
            defaultValue="1" 
            className="accent-blue-500"
            title="Adjust balance between keyword and semantic search"
            onChange={(e) => onSearchWeightChange?.(parseFloat(e.target.value))}
          />
          <span>Search Mode</span>
        </div>
        <div className="text-xs ml-auto">
          <span className="mr-2">Keywords</span>
          <span>Semantic</span>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;