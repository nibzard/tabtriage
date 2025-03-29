# CLAUDE.md - Guidelines for Zencoder

## Build Commands
- `yarn dev` / `npm run dev` - Start development server
- `yarn build` / `npm run build` - Create production build
- `yarn start` / `npm run start` - Run production build
- `yarn lint` / `npm run lint` - Run ESLint

## Code Style
- **TypeScript**: Use strict typing with interfaces in `/src/types`
- **Imports**: Use path aliases (`@/*`) for all imports
- **Components**: PascalCase for component files and functions
- **Variables**: camelCase for variables and functions
- **Error Handling**: Use try/catch with the logger utility
- **Formatting**: 2-space indentation, semicolons required
- **Logging**: Use `/src/utils/logger.ts` with appropriate log levels
- **File Organization**: Follow Next.js App Router conventions
- **State Management**: React Query + Context API for shared state
- **Environment Variables**: Validate in code, store in `.env.local`
- **Testing**: No test framework currently defined

## Architecture
- Next.js with App Router pattern
- Supabase for database and authentication
- OpenAI integration for AI features
- Tailwind CSS for styling