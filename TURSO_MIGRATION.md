# Turso Migration Plan

## Overview
Migrate from Supabase to Turso (SQLite-based edge database) for better simplicity and longevity.

## Phase 1: Setup & Database
- [ ] Research Turso setup and integration requirements
- [ ] Create Turso account and database  
- [ ] Install Turso/LibSQL client dependencies
- [ ] Create database schema migration script
- [ ] Update database connection utilities

## Phase 2: Core Migration
- [ ] Migrate API routes from Supabase to Turso
- [ ] Update authentication system (consider NextAuth.js)
- [ ] Migrate storage solution for screenshots (consider Uploadthing/R2)

## Phase 3: Testing & Cleanup
- [ ] Test all API endpoints with Turso
- [ ] Update environment variables
- [ ] Clean up old Supabase code

## Key Considerations

### Database Schema
Current tables to migrate:
- `tabs` - Main tab storage
- `folders` - Folder organization
- `tags` - Tag system
- `tab_tags` - Many-to-many relationship
- `suggested_folders` - AI suggestions

### Authentication
- Replace Supabase Auth with NextAuth.js or simple session-based auth
- Consider OAuth providers (Google, GitHub) via NextAuth.js

### File Storage
- Replace Supabase Storage with:
  - Uploadthing (recommended for simplicity)
  - Cloudflare R2 (S3-compatible, cost-effective)
  - Local file storage for development

### Benefits of Migration
- **Simplicity**: SQLite is much simpler than PostgreSQL
- **Performance**: Edge database with global replication
- **Cost**: More predictable pricing
- **Longevity**: SQLite will outlast most cloud services
- **Development**: Easier local development with SQLite