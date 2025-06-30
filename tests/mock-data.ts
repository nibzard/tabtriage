
import { Tab } from '../src/types/Tab';

export const mockTabs: Tab[] = [
  {
    id: '1',
    url: 'https://example.com',
    title: 'Example Domain',
    domain: 'example.com',
    status: 'unprocessed',
    dateAdded: new Date().toISOString(),
    thumbnail: 'https://via.placeholder.com/150',
    screenshot: 'https://via.placeholder.com/150',
    fullScreenshot: 'https://via.placeholder.com/150',
    summary: 'This is an example domain.',
    tags: ['example', 'test'],
    folderId: null,
    userId: '1',
    embedding: [],
    content: '',
    category: '',
  },
];
