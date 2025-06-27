import React from 'react';
import { highlightSearchTerm, extractSearchTerms, HighlightSegment } from '@/utils/searchHighlight';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Component that highlights search terms within text
 */
export function HighlightedText({ 
  text, 
  searchTerm, 
  className = '',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded'
}: HighlightedTextProps) {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  const searchTerms = extractSearchTerms(searchTerm);
  const segments = highlightSearchTerm(text, searchTerm);

  return (
    <span className={className}>
      {segments.map((segment: HighlightSegment, index: number) => 
        segment.isHighlighted ? (
          <mark key={index} className={highlightClassName}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}

interface SearchSnippetProps {
  text: string;
  searchTerm: string;
  maxLength?: number;
  className?: string;
  highlightClassName?: string;
}

/**
 * Component that shows a snippet of text with highlighted search terms
 */
export function SearchSnippet({
  text,
  searchTerm,
  maxLength = 150,
  className = 'text-sm text-muted-foreground',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded font-medium'
}: SearchSnippetProps) {
  if (!searchTerm || !text) {
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    return <span className={className}>{truncated}</span>;
  }

  const searchTerms = extractSearchTerms(searchTerm);
  
  // Find the best snippet around search terms
  const lowerText = text.toLowerCase();
  let bestStart = 0;
  let bestScore = 0;

  // Try to find the position that captures the most search terms
  for (let i = 0; i <= text.length - maxLength; i += 10) {
    const snippet = text.substring(i, i + maxLength).toLowerCase();
    const score = searchTerms.reduce((acc, term) => {
      return acc + (snippet.includes(term.toLowerCase()) ? 1 : 0);
    }, 0);
    
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  const endIndex = Math.min(text.length, bestStart + maxLength);
  let snippet = text.substring(bestStart, endIndex);
  
  // Add ellipsis if needed
  if (bestStart > 0) snippet = '...' + snippet;
  if (endIndex < text.length) snippet = snippet + '...';

  return (
    <HighlightedText
      text={snippet}
      searchTerm={searchTerm}
      className={className}
      highlightClassName={highlightClassName}
    />
  );
}