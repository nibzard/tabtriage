# Product Specification: TabTriage - Web-based Safari Tab Management Solution

## EXECUTIVE SUMMARY:
TabTriage is a mobile-first web application designed to help users manage and organize their overwhelming Safari tabs. The MVP focuses on the core triage functionality: importing tabs from Safari, presenting them in a visual gallery, and providing intuitive mechanisms to quickly decide which to keep and how to organize them. The solution heavily leverages AI to automate organization and provide content summaries, minimizing user effort while maximizing productivity.

## ARCHITECTURE OVERVIEW:
The system consists of three primary components:

1. **Tab Import Module**: Processes bookmark exports from Safari
2. **AI Processing Engine**: Automatically analyzes, summarizes, and categorizes content
3. **Interactive Gallery Interface**: Provides the visual triage environment

## TECHNOLOGY STACK:

### Frontend:
- **Framework**: Next.js (Rationale: Excellent performance, SEO capabilities, and modern React features)
- **Styling**: Tailwind CSS (Rationale: Rapid development, consistent design system, responsive capabilities)
- **State Management**: React Query + Context API (Rationale: Simpler than Redux, sufficient for MVP needs)
- **Animation/Gestures**: Framer Motion (Rationale: Well-supported library for web animations and gestures)

### Backend:
- **Architecture**: Serverless functions (Rationale: Cost-effective, scalable for variable usage patterns)
- **Provider**: Vercel or Netlify (Rationale: Tight integration with Next.js, simplified deployment)
- **Database**: Turso (Rationale: SQLite-based edge database with global replication, simpler than PostgreSQL, excellent longevity)
- **ORM**: Drizzle ORM (Rationale: Type-safe database queries, lightweight, great developer experience)
- **Authentication**: Simple session-based auth (Rationale: MVP simplicity, NextAuth.js planned for future)

### AI Integration:
- **Core Engine**: OpenAI GPT-4o API (Rationale: Best-in-class capabilities for content understanding)
- **Processing**: Server-side batch processing to minimize token usage
- **Search**: SQLite FTS5 full-text search (Rationale: Built-in, fast, no external dependencies)

### Storage:
- **User Data**: SQLite via Turso (structured data, metadata, with edge replication for performance)
- **Images**: Local file storage initially (Rationale: MVP simplicity, migration to Uploadthing/R2 planned)
- **Local Caching**: IndexedDB for offline functionality

## FUNCTIONAL REQUIREMENTS:

### MVP Core Features

#### Tab Import
1. Accept bookmark HTML exports from Safari (primary method)
2. Parse bookmark metadata (title, URL, date added)
3. Process imported URLs to capture screenshots and content

#### AI-Powered Organization
1. Automatically generate concise descriptions (30-50 words) for each page
2. Automatically categorize content into suggested folders
3. Generate relevant tags based on content analysis
4. Identify potential duplicates or similar content

#### Visual Triage Interface
1. Present tabs as a responsive grid of visual cards with screenshots
2. Implement swipe/click gestures for keep or discard decisions
3. Display AI-generated description on each card
4. Enable quick assignment to folders with AI-suggested destinations
5. Support both mobile and desktop viewing with optimized layouts

#### Basic Organization
1. Allow creation and management of folders
2. Support basic tagging system (both AI and manual)
3. Provide simple filtering options (by date, domain, AI categories)
4. Enable search functionality across all saved tabs

### Future Phase Features (Post-MVP)
1. Advanced filtering and sorting options
2. Browser extension for direct tab import
3. Offline mode with full functionality
4. Collaborative sharing of organized collections
5. Advanced analytics on browsing habits
6. Reading mode for saved content

## AI INTEGRATION (MVP FOCUS):

1. **Automated Content Processing**:
   - Screenshot generation and visual analysis
   - Content extraction and summarization
   - Identification of key topics and concepts

2. **Organizational Intelligence**:
   - Automatic folder suggestions based on content themes
   - Smart categorization of pages by type (article, product, reference, etc.)
   - Priority scoring to highlight potentially important pages

3. **Implementation Approach**:
   - Server-side processing using OpenAI API
   - Batch processing to optimize API usage and costs
   - Progressive enhancement (show basic information while AI processing completes)

## IMPLEMENTATION CONSIDERATIONS:

### MVP Development Focus
- Emphasize speed to market with core triage functionality
- Build with scalability in mind but optimize for immediate usefulness
- Focus on smooth, intuitive UX rather than feature completeness
- Implement AI features that provide immediate organization value

### Technical Approach
- Progressive Web App capabilities for improved mobile experience
- Responsive design with mobile-first approach
- Client-side caching for performance
- Asynchronous processing for AI tasks

### Performance Optimization
- Lazy loading of images and content
- Virtualized lists for handling large numbers of tabs
- Efficient batch processing of API calls
- Image optimization for faster loading

### Security & Privacy
- Client-side processing where possible
- Transparent AI usage policies
- No unnecessary data retention
- HTTPS and standard web security practices

## USER EXPERIENCE FLOW (MVP):

1. **Onboarding**:
   - Brief explanation of the app's purpose
   - Instructions for exporting Safari bookmarks
   - Upload interface for bookmark file

2. **Processing**:
   - Progress indicator while tabs are being processed
   - Initial display of basic information while AI processing continues
   - Background processing to allow immediate interaction

3. **Triage Interface**:
   - Gallery view of all imported tabs with screenshots
   - Swipe left to discard, right to keep (or equivalent click actions on desktop)
   - Quick-access buttons for common folders (AI-suggested)
   - Visual indicators of AI-suggested categorization

4. **Organization View**:
   - Folder-based view of saved tabs
   - Simple filtering and search options
   - Quick-edit capabilities for descriptions and tags

This specification outlines a focused MVP approach for TabTriage that prioritizes rapid development of core functionality while leveraging AI to automate the organization process. The web-based, mobile-first approach ensures accessibility across devices while enabling quick iteration based on user feedback.