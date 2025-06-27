/**
 * Utility functions for highlighting search terms in text
 */

export interface HighlightSegment {
  text: string;
  isHighlighted: boolean;
}

/**
 * Highlights search terms in text by returning segments
 * @param text - The text to search in
 * @param searchTerm - The search term to highlight
 * @returns Array of text segments with highlight information
 */
export function highlightSearchTerm(text: string, searchTerm: string): HighlightSegment[] {
  if (!text || !searchTerm) {
    return [{ text, isHighlighted: false }];
  }

  // Create a regex that matches the search term (case insensitive)
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => ({
    text: part,
    isHighlighted: regex.test(part)
  }));
}

/**
 * Highlights multiple search terms in text
 * @param text - The text to search in
 * @param searchTerms - Array of search terms to highlight
 * @returns Array of text segments with highlight information
 */
export function highlightMultipleTerms(text: string, searchTerms: string[]): HighlightSegment[] {
  if (!text || !searchTerms.length) {
    return [{ text, isHighlighted: false }];
  }

  // Clean and filter search terms
  const cleanTerms = searchTerms
    .filter(term => term.trim().length > 0)
    .map(term => escapeRegExp(term.trim()));

  if (cleanTerms.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Create a regex that matches any of the search terms
  const regex = new RegExp(`(${cleanTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part) => ({
    text: part,
    isHighlighted: cleanTerms.some(term => 
      new RegExp(`^${term}$`, 'i').test(part)
    )
  }));
}

/**
 * Extracts search terms from a query string
 * @param query - The search query
 * @returns Array of individual search terms
 */
export function extractSearchTerms(query: string): string[] {
  if (!query) return [];
  
  // Split by spaces and filter out empty strings
  return query
    .split(/\s+/)
    .filter(term => term.length > 0)
    .map(term => term.toLowerCase());
}

/**
 * Creates a snippet from text around the first occurrence of search terms
 * @param text - The full text
 * @param searchTerms - Array of search terms
 * @param maxLength - Maximum length of the snippet
 * @returns Text snippet with context around search terms
 */
export function createSearchSnippet(
  text: string, 
  searchTerms: string[], 
  maxLength: number = 150
): string {
  if (!text || !searchTerms.length) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  const lowerText = text.toLowerCase();
  const lowerTerms = searchTerms.map(term => term.toLowerCase());
  
  // Find the first occurrence of any search term
  let firstIndex = text.length;
  for (const term of lowerTerms) {
    const index = lowerText.indexOf(term);
    if (index !== -1 && index < firstIndex) {
      firstIndex = index;
    }
  }

  if (firstIndex === text.length) {
    // No terms found, return truncated text from beginning
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Calculate snippet boundaries
  const contextLength = Math.floor((maxLength - searchTerms[0].length) / 2);
  const startIndex = Math.max(0, firstIndex - contextLength);
  const endIndex = Math.min(text.length, startIndex + maxLength);

  let snippet = text.substring(startIndex, endIndex);
  
  // Add ellipsis if needed
  if (startIndex > 0) snippet = '...' + snippet;
  if (endIndex < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Escapes special regex characters in a string
 * @param string - The string to escape
 * @returns Escaped string safe for use in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}