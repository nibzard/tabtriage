# TabTriage

TabTriage is a mobile-first web application designed to help users manage and organize their overwhelming Safari tabs. The application provides an intuitive interface for importing tabs from Safari, presenting them in a visual gallery, and providing mechanisms to quickly decide which to keep and how to organize them.

## Features

### Tab Import
- Accept bookmark HTML exports from Safari
- Parse bookmark metadata (title, URL, date added)
- Process imported URLs to capture screenshots and content

### AI-Powered Organization
- **Jina Embeddings v3**: State-of-the-art multilingual semantic embeddings with task-specific LoRA adapters
- **Hybrid Search**: Combines vector similarity search with traditional text search (SQLite FTS5)
- Automatically generate concise descriptions (30-50 words) for each page
- Automatically categorize content into suggested folders
- Generate relevant tags based on content analysis
- Identify potential duplicates or similar content using semantic similarity
- Fetch and analyze page content for better summaries

### Visual Triage Interface
- Present tabs as a responsive grid of visual cards with screenshots
- Implement swipe/click gestures for keep or discard decisions
- Display AI-generated description on each card
- Enable quick assignment to folders with AI-suggested destinations
- Support both mobile and desktop viewing with optimized layouts
- Bulk actions for selecting multiple tabs (keep, discard, assign to folder)

### Advanced Organization & Search
- **Semantic Search**: Find tabs by meaning, not just keywords (powered by Jina v3)
- **Vector Similarity**: Discover related content across your entire collection
- **Hybrid Ranking**: Configurable weights between semantic and keyword relevance
- Allow creation and management of folders
- Support advanced tagging system (both AI and manual)
- Provide comprehensive filtering options (by date, domain, AI categories, similarity)
- Real-time search with instant results and relevance scoring

## Technology Stack

### Frontend
- **Framework**: Next.js
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Animation/Gestures**: Framer Motion
- **Theming**: Dark/Light mode with next-themes

### Backend
- **Architecture**: Serverless functions
- **Provider**: Vercel or Netlify
- **Database**: Turso (SQLite-based edge database)
- **ORM**: Drizzle ORM for type-safe database queries
- **Authentication**: Simple session-based (NextAuth.js planned)

### AI Integration
- **Embeddings**: Jina Embeddings v3 with 1024-dimensional vectors and task-specific LoRA adapters
- **Core Engine**: OpenAI GPT-4o API for content analysis
- **Vector Search**: Turso native F32_BLOB vectors with DiskANN algorithm
- **Text Search**: SQLite FTS5 with BM25 scoring for keyword matching
- **Hybrid Search**: Combines semantic understanding with traditional text search
- **Processing**: Automatic background embedding generation with rate limiting

### Storage
- **User Data**: SQLite via Turso with global edge replication
- **Images**: Local file storage (migration to Uploadthing/R2 planned)
- **Local Caching**: IndexedDB for offline functionality

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tabtriage.git
   cd tabtriage
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   # Turso Database Configuration
   TURSO_DATABASE_URL=your_turso_database_url
   TURSO_AUTH_TOKEN=your_turso_auth_token
   
   # AI API Keys
   OPENAI_API_KEY=your_openai_api_key
   JINA_API_KEY=your_jina_api_key
   JINA_API_URL=https://api.jina.ai/v1/embeddings
   ```

4. Set up the database:
   ```bash
   npm run migrate
   ```

5. (Optional) View your database:
   ```bash
   npm run db:studio
   ```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
npm run build
# or
yarn build
```

Then, to start the production server:

```bash
npm run start
# or
yarn start
```

## How to Use TabTriage

### Exporting Safari Tabs

#### On iOS (iPhone/iPad):
1. Open Safari
2. Tap the tabs icon in the bottom right corner (looks like two squares)
3. Long press on "X Tabs" at the bottom of the screen
4. Select "Copy X Links" from the menu (where X is the number of tabs)
5. Paste the copied links in TabTriage

#### On macOS:
1. Open Safari
2. Click on View > Show Tab Overview
3. Select the tabs you want to export (Cmd+click for multiple)
4. Right-click and choose "Copy Links"
5. Paste the copied links in TabTriage

#### Alternative Methods:
- Save your links to a text file (.txt) with one URL per line
- Create a CSV file with URLs and upload it to TabTriage

### Importing Tabs
1. Navigate to the Import page
2. Choose one of the following methods:
   - **Paste URLs**: Paste your copied Safari tab links into the text area
   - **Upload File**: Drag and drop a text or CSV file with URLs, or click "Browse Files"
3. Click "Import Tabs" to begin processing
4. Wait for the AI to analyze and organize your tabs

### Triaging Tabs
1. Go to the Gallery page to see all your imported tabs
2. Swipe left to discard a tab, right to keep it (or use the buttons)
3. Click the expand button to see folder suggestions
4. Assign tabs to folders based on AI suggestions or your preference

### Managing Folders
1. Navigate to the Folders page
2. View all your organized tabs by folder
3. Create new folders as needed
4. Search and filter tabs within folders

## Project Structure

```
tabtriage/
├── public/              # Static files
├── src/                 # Source code
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   │   ├── gallery/     # Tab gallery components
│   │   ├── folders/     # Folder management components
│   │   └── import/      # Tab import components
│   ├── context/         # React context providers
│   ├── data/            # Mock data and constants
│   ├── services/        # API and service functions
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── .env.local           # Environment variables (not in repo)
├── next.config.js       # Next.js configuration
├── package.json         # Project dependencies
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Advanced Features

### Vector Search & Embeddings
- **1024-dimensional embeddings** using Jina Embeddings v3
- **Task-specific optimization** with LoRA adapters:
  - `retrieval.passage` for stored content
  - `retrieval.query` for search queries
  - `text-matching` for similarity comparison
- **Matryoshka embeddings** support (32-1024 dimensions)
- **Multilingual support** for 89+ languages with optimized performance for 30 languages
- **Automatic embedding generation** for new tabs with background processing

### Search Capabilities
- **Semantic similarity search** finds related content by meaning
- **Hybrid search** with configurable vector/text weights (default 70%/30%)
- **BM25 scoring** for traditional keyword relevance
- **Vector distance scoring** for semantic relevance
- **Real-time search** with instant results as you type
- **Search debugging** with detailed relevance scores and ranking

### Database Architecture
- **Turso SQLite** with global edge replication
- **Native vector support** with F32_BLOB(1024) columns
- **Vector indexing** using libsql_vector_idx for fast similarity search
- **FTS5 virtual tables** for full-text search with advanced tokenization
- **Drizzle ORM** for type-safe database operations

## API Testing Endpoints

For development and debugging, the following test endpoints are available:

```bash
# Test Jina API connection
curl "http://localhost:3000/api/test-jina?action=test-connection"

# Get embedding statistics
curl "http://localhost:3000/api/test-jina?action=stats"

# Generate embeddings for existing tabs
curl "http://localhost:3000/api/test-jina?action=update-embeddings&batchSize=10"

# Test hybrid search
curl "http://localhost:3000/api/test-jina?action=search&q=your%20search%20query&limit=5"

# Test embedding generation
curl "http://localhost:3000/api/test-jina?action=test-embedding&text=Your%20test%20text"
```

## Future Enhancements

- Browser extension for direct tab import
- Offline mode with full functionality
- Collaborative sharing of organized collections
- Advanced analytics on browsing habits and content patterns
- Reading mode for saved content
- Advanced filtering with semantic similarity clustering
- Custom embedding fine-tuning for domain-specific content
- Multi-modal search combining text and visual content

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.