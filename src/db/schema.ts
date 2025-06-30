import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, primaryKey, real } from 'drizzle-orm/sqlite-core';

// Simplified users table matching our actual schema
export const users = sqliteTable("users", {
  id: text("id").notNull().primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
})

// Folders table
export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  icon: text('icon'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tabs table with proper F32_BLOB embedding type
export const tabs = sqliteTable('tabs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  domain: text('domain'),
  dateAdded: text('date_added').default(sql`CURRENT_TIMESTAMP`),
  summary: text('summary'),
  category: text('category').default('uncategorized'),
  thumbnailUrl: text('thumbnail_url'),
  screenshotUrl: text('screenshot_url'),
  fullScreenshotUrl: text('full_screenshot_url'),
  status: text('status', { enum: ['unprocessed', 'kept', 'discarded'] }).default('unprocessed'),
  // Note: F32_BLOB(1024) type is handled at SQL level, Drizzle sees it as text
  embedding: text('embedding'), 
  // Store the extracted page content used for embedding generation
  content: text('content'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tags table
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tab tags junction table
export const tabTags = sqliteTable('tab_tags', {
  tabId: text('tab_id').notNull().references(() => tabs.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.tabId, table.tagId] }),
}));

// Suggested folders table - updated to match migration
export const suggestedFolders = sqliteTable('suggested_folders', {
  id: text('id').primaryKey(),
  tabId: text('tab_id').notNull().references(() => tabs.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  confidence: real('confidence').notNull().default(0.0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Import batches table for tracking bulk imports
export const importBatches = sqliteTable('import_batches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  totalTabs: integer('total_tabs').notNull().default(0),
  successfulTabs: integer('successful_tabs').notNull().default(0),
  failedTabs: integer('failed_tabs').notNull().default(0),
  progress: integer('progress').notNull().default(0), // 0-100
  errors: text('errors'), // JSON array of error messages
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

export type Tab = typeof tabs.$inferSelect;
export type NewTab = typeof tabs.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type TabTag = typeof tabTags.$inferSelect;
export type NewTabTag = typeof tabTags.$inferInsert;

export type SuggestedFolder = typeof suggestedFolders.$inferSelect;
export type NewSuggestedFolder = typeof suggestedFolders.$inferInsert;

export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;
