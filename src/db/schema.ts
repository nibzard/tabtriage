import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  displayName: text('display_name'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// Folders table
export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  icon: text('icon'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index('folders_user_id_idx').on(table.userId),
  userNameUnique: uniqueIndex('folders_user_name_unique').on(table.userId, table.name),
}));

// Tabs table
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
  screenshotUrl: text('screenshot_url'),
  fullScreenshotUrl: text('full_screenshot_url'),
  status: text('status', { enum: ['unprocessed', 'kept', 'discarded'] }).default('unprocessed'),
  embedding: text('embedding'), // F32_BLOB(1024) - 1024-dimensional vector for Jina v3 (stored as text in Drizzle)
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index('tabs_user_id_idx').on(table.userId),
  folderIdIdx: index('tabs_folder_id_idx').on(table.folderId),
  domainIdx: index('tabs_domain_idx').on(table.domain),
  dateAddedIdx: index('tabs_date_added_idx').on(table.dateAdded),
}));

// Tags table
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index('tags_user_id_idx').on(table.userId),
  userNameUnique: uniqueIndex('tags_user_name_unique').on(table.userId, table.name),
}));

// Tab tags junction table
export const tabTags = sqliteTable('tab_tags', {
  tabId: text('tab_id').notNull().references(() => tabs.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: sql`PRIMARY KEY (${table.tabId}, ${table.tagId})`,
}));

// Suggested folders table
export const suggestedFolders = sqliteTable('suggested_folders', {
  tabId: text('tab_id').notNull().references(() => tabs.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: sql`PRIMARY KEY (${table.tabId}, ${table.folderId})`,
}));

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