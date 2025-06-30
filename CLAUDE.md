# CLAUDE.md - Guidelines for Zencoder

## Build Commands
- `pnpm dev` - Start development server
- `pnpm build` - Create production build
- `pnpm start` - Run production build
- `pnpm lint` - Run ESLint (shows warnings and errors)
- `pnpm lint:errors` - Run ESLint (shows only errors)

## Code Style
- **TypeScript**: Use strict typing with interfaces in `/src/types`
- **Imports**: Use path aliases (`@/*`) for all imports
- **Components**: PascalCase for component files and functions
- **Variables**: camelCase for variables and functions
- **Error Handling**: Use try/catch with the logger utility
- **Formatting**: 2-space indentation, no semicolons (configured in .prettierrc)
- **Logging**: Use `/src/utils/logger.ts` with appropriate log levels
- **File Organization**: Follow Next.js App Router conventions
- **State Management**: React Query + Context API for shared state
- **Environment Variables**: Validate in code, store in `.env.local`
- **Testing**: No test framework currently defined
- **Package Manager**: Always use pnpm, never npm or yarn

## Architecture
- Next.js with App Router pattern
- Supabase for database and authentication
- OpenAI integration for AI features
- Tailwind CSS for styling