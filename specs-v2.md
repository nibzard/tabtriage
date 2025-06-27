## **Functional Specification: TabTriage v2.0**

### 1. Project Vision & Core Principles

**Vision:** TabTriage is a minimalist, mobile-first web application that transforms the chaotic process of managing browser tabs into a simple, fast, and even enjoyable experience. It helps users reclaim their digital space by providing smart, AI-powered tools to quickly sort, organize, and rediscover their saved web pages.

**Core Principles for Development:**

*   **Simplicity (KISS):** Every feature and UI element must have a clear purpose. Avoid clutter, complex settings, and unnecessary steps. The user's goal is to manage tabs, and the app must facilitate that with minimal friction.
*   **Don't Make Me Think (Intuitive UX):** The user should understand how to use the app instantly. Actions should be obvious, and the flow should feel natural. Prioritize clear visual hierarchy, straightforward language, and familiar interaction patterns (like swiping).
*   **Mobile-First, Desktop-Ready:** The primary design target is a mobile browser. The experience must be flawless on a touch screen. The desktop interface should be an enhanced, responsive version of the mobile experience, not a separate concept.
*   **Performant & Responsive:** The application must feel fast and fluid, even when handling thousands of tabs. UI interactions should be instantaneous, with background tasks never blocking the user.

---

### 2. Core User Flow

The user journey is designed to be a simple, linear process:

1.  **Landing & Import:** The user arrives and is immediately prompted to import their tabs. There is a single, clear call-to-action.
2.  **Automatic Enrichment (The Magic):** As tabs are imported, the system works in the background to fetch content, generate screenshots, create summaries, and categorize them. **The user does not wait for this to finish.** They can start triaging immediately.
3.  **Triage (The Main Event):** The user is presented with a visual gallery of their unprocessed tabs. They can quickly swipe or click to **Keep** or **Discard** each tab.
4.  **Organize (The Follow-up):** Kept tabs can be easily moved into folders. The system provides smart suggestions to make this effortless.
5.  **Rediscover (The Payoff):** The user can easily browse their organized tabs in folders or use a powerful semantic search to find anything they've saved.

---

### 3. Detailed Functional Requirements

#### 3.1. User Authentication & Data Persistence

*   **Goal:** Provide a seamless way for users to save their data without the friction of traditional sign-up forms.
*   **Requirements:**
    *   **Magic Link Sign-In:** The primary authentication method will be passwordless sign-in via a magic link sent to the user's email. The UI for this should be a single email input field and a button.
    *   **Anonymous/Guest Access:** If a user starts importing tabs without signing in, create a temporary anonymous session. All data should be saved locally to the browser's `localStorage`.
    *   **Seamless Transition:** When an anonymous user decides to sign in, their locally saved data must be seamlessly migrated and synced to their new account. The user should not lose any work.
    *   **User Menu:** Once signed in, a simple user menu should display the user's email and a "Sign Out" button.

#### 3.2. Tab Import

*   **Goal:** Make it incredibly easy for users to get their tabs into the application.
*   **UI/UX (KISS Principle):**
    *   Design a single, unified import screen. This screen will feature a large drop-zone that also functions as a textarea.
    *   The user can either:
        1.  **Paste links** directly into the textarea.
        2.  **Drag and drop** a `.txt` or `.html` file onto the area.
        3.  **Click a button** to open a file browser.
    *   As the user pastes text, provide real-time feedback on how many valid URLs have been detected.
*   **Functional Requirements:**
    *   **Paste URLs:** Accept a list of URLs separated by newlines, spaces, or commas. The parser must be robust enough to handle messy pastes.
    *   **File Upload:** Support `.txt` (one URL per line) and Safari's `.html` bookmark export format.
    *   **URL Validation:** Robustly validate and clean URLs. Automatically prefix with `https://` if no protocol is present. Silently ignore invalid entries and duplicates without showing a user-facing error.
    *   **Initiate Processing:** Once the user clicks "Import", immediately start the background processing and navigate them to the Triage Gallery.

#### 3.3. AI Processing & Enrichment (Background Task)

*   **Goal:** Automatically enrich each tab with useful metadata to make triaging and organization effortless.
*   **UX Principle:** This entire process must run in the background without blocking the user. The Triage Gallery should display tabs with basic info (title/URL) immediately, and the enriched data (screenshots, summaries) should pop in as they become available. Use skeleton loaders or placeholders to indicate loading states.
*   **Functional Requirements:**
    *   For each imported URL, a serverless function should perform the following:
        1.  **Fetch Content:** Scrape the main text content of the page.
        2.  **Generate Screenshot:** Capture a high-quality screenshot of the webpage above the fold.
        3.  **Generate Summary:** Use an LLM (like GPT-4o-mini) to create a concise, 30-50 word summary of the page content.
        4.  **Categorize:** Assign a single, relevant category (e.g., "Tech," "Shopping," "News," "Reference").
        5.  **Generate Tags:** Create 2-4 relevant keywords (tags) for the content.
        6.  **Generate Embedding:** Create a 384-dimension vector embedding (using GTE-Small model) from the tab's title and summary for semantic search.
        7.  **Text Indexing:** Index the tab's title and summary for full-text search (using SQLite FTS5).
    *   All this data must be saved to the `tabs` table in the database.

#### 3.4. The Triage Gallery (`/gallery`)

*   **Goal:** Provide a fast, visual, and satisfying way for users to process their tabs. This is the core of the app.
*   **UI/UX:**
    *   The default view is a responsive grid of "Tab Cards" showing only **unprocessed** tabs.
    *   **Tab Card:** Each card must clearly display:
        *   The screenshot as the primary visual element.
        *   The tab title.
        *   The AI-generated summary.
        *   Primary action buttons: **"Keep"** and **"Discard"**.
    *   **Filtering:** A simple, always-visible filter bar at the top allows users to view "To Triage", "Kept", and "Discarded" tabs.
    *   **Gestures (Mobile):**
        *   Swipe Right -> **Keep**.
        *   Swipe Left -> **Discard**.
        *   A satisfying animation and haptic feedback should accompany the swipe.
    *   **Bulk Actions:** Allow users to multi-select tabs (simple tap-to-select). When one or more tabs are selected, a contextual action bar appears at the bottom with options: "Keep Selected", "Discard Selected", "Move to Folder".
*   **Functional Requirements:**
    *   Display a virtualized list of tabs for high performance.
    *   "Keep" action changes a tab's status to `kept`.
    *   "Discard" action changes a tab's status to `discarded`. The tab should be hidden from the main view but accessible via the "Discarded" filter.
    *   The "Discarded" view should have a "Delete Permanently" action for each tab and an "Empty Trash" button.

#### 3.5. Folders & Organization (`/folders`)

*   **Goal:** Provide a simple, clean interface for viewing and managing organized tabs.
*   **UI/UX:**
    *   A two-column layout on desktop: a list of folders on the left, and the contents of the selected folder on the right. On mobile, this will be two separate views.
    *   **Folder Creation:** A clear "New Folder" button. When clicked, it should prompt for a name inline, without a disruptive modal. A random color is assigned automatically.
    *   The folder list should show the number of tabs in each folder.
    *   The folder content view displays tabs as a simple, scannable list (not cards) showing the title, domain, and summary.
*   **Functional Requirements:**
    *   Full CRUD (Create, Read, Update, Delete) functionality for folders.
    *   Deleting a folder moves its contained tabs back to the "Kept" but unorganized state. It does not delete the tabs.
    *   Tabs can be assigned to folders from the Triage Gallery or moved between folders in the Folders view.
    *   AI-suggested folders should be presented as quick-action buttons on the Tab Card in the Triage Gallery.

#### 3.6. Search

*   **Goal:** Allow users to instantly find any tab they've saved, using natural language.
*   **UI/UX:**
    *   A single, prominent search bar in the header or at the top of the Gallery/Folders views.
    *   Search results should appear instantly as the user types (with debouncing).
    *   The results page should be the same as the gallery/list view to maintain consistency.
    *   **Simplicity:** By default, the search is a simple input. An "Advanced" toggle can reveal the "Keyword vs. Semantic" weight slider for power users.
*   **Functional Requirements:**
    *   Implement **hybrid search** by combining keyword-based search (Postgres `tsvector`) and semantic vector search (Postgres `pgvector`).
    *   The search query should be used for both a keyword match against `title`, `summary`, and `tags`, and to generate a query embedding for a vector similarity search against the tab embeddings.
    *   The backend should have a mechanism (like the existing RPC function `hybrid_search`) to combine and rank results from both search methods.

---

### 4. Non-Functional Requirements

*   **Performance:**
    *   The gallery view must handle 2,000+ tabs without any lag. Use list virtualization (`@tanstack/react-virtual`).
    *   Images (screenshots) must be lazy-loaded.
    *   Initial page load should be under 2 seconds.
*   **Accessibility:** The application should be keyboard-navigable and screen-reader friendly, adhering to WCAG 2.1 A/AA guidelines.
*   **Security:**
    *   All communication with the backend must be over HTTPS.
    *   Implement and enable Supabase Row Level Security (RLS) for all tables in production to ensure users can only access their own data.
*   **Data Handling & Privacy:**
    *   User tab data is private and should never be shared.
    *   Provide a robust fallback to `localStorage` if the server is unavailable or the user is offline, ensuring no data is lost.

---

### 5. Recommended Architecture & Technology

The existing stack is excellent. The main architectural improvement is to simplify client-side state management.

*   **Frontend:** Next.js 14+ with App Router.
*   **UI:** Tailwind CSS with a component library like **shadcn/ui** (the current `src/components/ui` structure is perfect for this).
*   **State Management (Improvement):**
    *   Use **`@tanstack/react-query`** for all server state (fetching, creating, updating, deleting tabs and folders). This will replace the complex, manual state management in the existing `TabsContext` and `FoldersContext`. It handles caching, invalidation, and optimistic updates elegantly.
    *   Use a simple React Context (`UIContext`) only for pure UI state that is shared across components (e.g., `expandedTabId`, `selectedTabs`).
*   **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
*   **AI & Embeddings:**
    *   **Summarization/Categorization:** OpenAI API (GPT-4o-mini is a good, cost-effective choice).
    *   **Embeddings:** GTE-Small model (384 dimensions) with automatic generation for new tabs.
    *   **Vector Storage:** Turso's native F32_BLOB columns with built-in similarity search.
    *   **Search:** Hybrid approach combining semantic vector search with SQLite FTS5 text search.

### 6. Database Schema (Turso SQLite)

The application uses Turso (SQLite-based edge database) with the following tables:

*   **`users`**: Stores user information.
    *   `id` (text, primary key)
    *   `email` (text, unique)
    *   `display_name` (text, nullable)
    *   `created_at` (datetime)
    *   `updated_at` (datetime)
*   **`tabs`**: The core table for all tab data.
    *   `id` (text, primary key)
    *   `user_id` (text, foreign key to `users.id`)
    *   `folder_id` (text, foreign key to `folders.id`, nullable)
    *   `title` (text)
    *   `url` (text)
    *   `domain` (text)
    *   `summary` (text, nullable)
    *   `category` (text, default 'uncategorized')
    *   `screenshot_url` (text, nullable)
    *   `status` (text: 'unprocessed', 'kept', 'discarded')
    *   `embedding_vector` (**F32_BLOB(384)**, nullable) - 384-dimensional vector for GTE-Small
    *   `date_added` (datetime)
    *   `created_at` (datetime)
    *   `updated_at` (datetime)
*   **`folders`**: Stores user-created folders.
    *   `id` (text, primary key)
    *   `user_id` (text, foreign key to `users.id`)
    *   `name` (text)
    *   `color` (text, nullable)
    *   `icon` (text, nullable)
    *   `created_at` (datetime)
    *   `updated_at` (datetime)
*   **`tags`**: Stores all unique tags.
    *   `id` (text, primary key)
    *   `user_id` (text, foreign key to `users.id`)
    *   `name` (text, unique constraint per user)
    *   `created_at` (datetime)
*   **`tab_tags`**: A join table for the many-to-many relationship between tabs and tags.
    *   `tab_id` (text, foreign key to `tabs.id`)
    *   `tag_id` (text, foreign key to `tags.id`)
    *   Primary key on (`tab_id`, `tag_id`)
*   **`suggested_folders`**: AI-suggested folder assignments.
    *   `tab_id` (text, foreign key to `tabs.id`)
    *   `folder_id` (text, foreign key to `folders.id`)
    *   Primary key on (`tab_id`, `folder_id`)

### 7. Search Infrastructure

**Vector Search:**
- Uses Turso's native vector support with `F32_BLOB(384)` columns
- Vector index created with `libsql_vector_idx(embedding_vector)`
- Supports cosine similarity search with `vector_distance_cos` function
- DiskANN algorithm for fast approximate nearest neighbors

**Text Search:**
- SQLite FTS5 virtual table (`tabs_fts`) for full-text search
- Indexes title, summary, and URL content
- Fast keyword matching and phrase queries

**Hybrid Search:**
- Combines vector similarity and text search results
- Configurable weighting between semantic and keyword relevance
- Relevance scoring for ranking results
- Fallback mechanisms for robust search experience