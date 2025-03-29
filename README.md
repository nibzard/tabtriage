# TabTriage

TabTriage is a mobile-first web application designed to help users manage and organize their overwhelming Safari tabs. The application provides an intuitive interface for importing tabs from Safari, presenting them in a visual gallery, and providing mechanisms to quickly decide which to keep and how to organize them.

## Features

### Tab Import
- Accept bookmark HTML exports from Safari
- Parse bookmark metadata (title, URL, date added)
- Process imported URLs to capture screenshots and content

### AI-Powered Organization
- Automatically generate concise descriptions (30-50 words) for each page
- Automatically categorize content into suggested folders
- Generate relevant tags based on content analysis
- Identify potential duplicates or similar content
- Fetch and analyze page content for better summaries

### Visual Triage Interface
- Present tabs as a responsive grid of visual cards with screenshots
- Implement swipe/click gestures for keep or discard decisions
- Display AI-generated description on each card
- Enable quick assignment to folders with AI-suggested destinations
- Support both mobile and desktop viewing with optimized layouts
- Bulk actions for selecting multiple tabs (keep, discard, assign to folder)

### Basic Organization
- Allow creation and management of folders
- Support basic tagging system (both AI and manual)
- Provide simple filtering options (by date, domain, AI categories)
- Enable search functionality across all saved tabs

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
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Auth0 or Clerk

### AI Integration
- **Core Engine**: OpenAI GPT-4o API
- **Processing**: Server-side batch processing
- **Embedding**: OpenAI text embeddings for content similarity and clustering

### Storage
- **User Data**: PostgreSQL via Supabase
- **Images**: Supabase Storage for screenshot storage
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
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=tab-screenshots
   ```

4. Set up Supabase Storage:
   - Create a new bucket named `tab-screenshots` in your Supabase project
   - Set the bucket's privacy settings to either public (for easy access) or authenticated (for more security)
   - Create a policy that allows users to upload and read files

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

## Future Enhancements

- Browser extension for direct tab import
- Offline mode with full functionality
- Collaborative sharing of organized collections
- Advanced analytics on browsing habits
- Reading mode for saved content
- Advanced filtering and sorting options

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.