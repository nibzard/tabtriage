import { Tab } from '@/types/Tab'
import { Folder } from '@/types/Folder'
import { generateUUID } from '@/utils/uuid'

// Generate UUIDs for folders
export const folders: Folder[] = [
  { id: generateUUID(), name: 'Read Later', color: '#4299e1' },
  { id: generateUUID(), name: 'Work', color: '#48bb78' },
  { id: generateUUID(), name: 'Shopping', color: '#ed8936' },
  { id: generateUUID(), name: 'Recipes', color: '#f56565' },
  { id: generateUUID(), name: 'Travel', color: '#9f7aea' },
  { id: generateUUID(), name: 'Technology', color: '#38b2ac' },
]

// Map for folder name to ID (for reference)
export const folderNameToId: Record<string, string> = {
  'read-later': folders[0].id,
  'work': folders[1].id,
  'shopping': folders[2].id,
  'recipes': folders[3].id,
  'travel': folders[4].id,
  'tech': folders[5].id,
}

export const mockTabs: Tab[] = [
  {
    id: generateUUID(),
    title: 'The Future of Web Development: What to Expect in 2024',
    url: 'https://example.com/web-dev-2024',
    domain: 'example.com',
    dateAdded: '2023-11-15',
    summary: 'This article explores upcoming trends in web development for 2024, including AI integration, WebAssembly advancements, and new JavaScript features.',
    category: 'reference',
    tags: ['webdev', 'javascript', 'trends'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['tech'], folderNameToId['work']]
  },
  {
    id: generateUUID(),
    title: 'Best Hiking Trails in California',
    url: 'https://example.com/california-hiking',
    domain: 'example.com',
    dateAdded: '2023-11-10',
    summary: 'A comprehensive guide to the most scenic hiking trails in California, including difficulty levels, best seasons to visit, and insider tips.',
    category: 'entertainment',
    tags: ['hiking', 'travel', 'outdoors'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['travel']]
  },
  {
    id: generateUUID(),
    title: 'Easy Weeknight Dinner Recipes',
    url: 'https://example.com/easy-dinners',
    domain: 'example.com',
    dateAdded: '2023-11-08',
    summary: 'Collection of quick and simple dinner recipes that can be prepared in under 30 minutes, perfect for busy weeknights.',
    category: 'reference',
    tags: ['cooking', 'recipes', 'food'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['recipes']]
  },
  {
    id: generateUUID(),
    title: 'Black Friday Deals on Electronics',
    url: 'https://example.com/black-friday-electronics',
    domain: 'example.com',
    dateAdded: '2023-11-20',
    summary: 'Roundup of the best Black Friday deals on laptops, smartphones, TVs, and other electronics from major retailers.',
    category: 'shopping',
    tags: ['deals', 'electronics', 'shopping'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['shopping'], folderNameToId['tech']]
  },
  {
    id: generateUUID(),
    title: 'Understanding React Server Components',
    url: 'https://example.com/react-server-components',
    domain: 'example.com',
    dateAdded: '2023-11-18',
    summary: 'Deep dive into React Server Components, explaining how they work, their benefits, and how to implement them in your applications.',
    category: 'reference',
    tags: ['react', 'javascript', 'webdev'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['tech'], folderNameToId['work']]
  },
  {
    id: generateUUID(),
    title: 'Latest News on Climate Change Policies',
    url: 'https://example.com/climate-policies-update',
    domain: 'example.com',
    dateAdded: '2023-11-22',
    summary: 'Recent developments in global climate change policies, including new agreements, targets, and initiatives from major countries.',
    category: 'news',
    tags: ['climate', 'politics', 'environment'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['read-later']]
  },
  {
    id: generateUUID(),
    title: 'Top 10 Must-Visit Destinations in Europe',
    url: 'https://example.com/europe-destinations',
    domain: 'example.com',
    dateAdded: '2023-11-05',
    summary: 'Guide to the most beautiful and culturally rich destinations in Europe, with travel tips, best times to visit, and accommodation recommendations.',
    category: 'entertainment',
    tags: ['travel', 'europe', 'vacation'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['travel']]
  },
  {
    id: generateUUID(),
    title: 'How to Improve Your Productivity Working from Home',
    url: 'https://example.com/wfh-productivity',
    domain: 'example.com',
    dateAdded: '2023-11-12',
    summary: 'Practical tips and strategies to boost your productivity while working remotely, including workspace setup, routine building, and focus techniques.',
    category: 'reference',
    tags: ['productivity', 'work', 'remote'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['work'], folderNameToId['read-later']]
  },
  {
    id: generateUUID(),
    title: 'Best Budget Smartphones of 2023',
    url: 'https://example.com/budget-smartphones-2023',
    domain: 'example.com',
    dateAdded: '2023-11-14',
    summary: 'Comprehensive review of affordable smartphones under $300 that offer the best value for money, comparing features, performance, and camera quality.',
    category: 'shopping',
    tags: ['smartphones', 'tech', 'reviews'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['tech'], folderNameToId['shopping']]
  },
  {
    id: generateUUID(),
    title: 'Beginner\'s Guide to Meditation',
    url: 'https://example.com/meditation-beginners',
    domain: 'example.com',
    dateAdded: '2023-11-07',
    summary: 'Step-by-step guide for meditation beginners, including different techniques, benefits, and tips for building a consistent practice.',
    category: 'reference',
    tags: ['meditation', 'wellness', 'health'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['read-later']]
  },
  {
    id: generateUUID(),
    title: 'Latest Updates on Twitter\'s New Features',
    url: 'https://example.com/twitter-updates',
    domain: 'example.com',
    dateAdded: '2023-11-21',
    summary: 'Overview of Twitter\'s recently launched features and upcoming changes, including user interface updates and new content moderation policies.',
    category: 'social',
    tags: ['twitter', 'social media', 'tech'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['tech']]
  },
  {
    id: generateUUID(),
    title: 'Healthy Breakfast Ideas for Busy Mornings',
    url: 'https://example.com/quick-healthy-breakfasts',
    domain: 'example.com',
    dateAdded: '2023-11-09',
    summary: 'Collection of nutritious and quick breakfast recipes that can be prepared in under 10 minutes, perfect for busy weekday mornings.',
    category: 'reference',
    tags: ['breakfast', 'recipes', 'health'],
    status: 'unprocessed',
    suggestedFolders: [folderNameToId['recipes']]
  },
  // Add a few tabs that are already in folders
  {
    id: generateUUID(),
    title: 'Advanced TypeScript Patterns for React',
    url: 'https://example.com/typescript-react-patterns',
    domain: 'example.com',
    dateAdded: '2023-11-16',
    summary: 'Deep dive into advanced TypeScript patterns and techniques specifically for React applications, including generics, utility types, and type inference.',
    category: 'reference',
    tags: ['typescript', 'react', 'webdev'],
    status: 'kept',
    folderId: folderNameToId['tech'],
    suggestedFolders: [folderNameToId['tech'], folderNameToId['work']]
  },
  {
    id: generateUUID(),
    title: 'Best Deals on Winter Clothing',
    url: 'https://example.com/winter-clothing-sales',
    domain: 'example.com',
    dateAdded: '2023-11-19',
    summary: 'Roundup of the best sales and discounts on winter clothing from major retailers, including coats, boots, and accessories.',
    category: 'shopping',
    tags: ['fashion', 'winter', 'deals'],
    status: 'kept',
    folderId: folderNameToId['shopping'],
    suggestedFolders: [folderNameToId['shopping']]
  },
  {
    id: generateUUID(),
    title: 'Rome Travel Guide: Hidden Gems and Local Favorites',
    url: 'https://example.com/rome-travel-guide',
    domain: 'example.com',
    dateAdded: '2023-11-03',
    summary: 'Insider\'s guide to Rome beyond the tourist attractions, featuring local restaurants, hidden viewpoints, and authentic experiences.',
    category: 'entertainment',
    tags: ['travel', 'italy', 'rome'],
    status: 'kept',
    folderId: folderNameToId['travel'],
    suggestedFolders: [folderNameToId['travel']]
  }
]