import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const families = sqliteTable('families', {
  id: text('id').primaryKey(), name: text('name').notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
export const members = sqliteTable('members', {
  id: text('id').primaryKey(), familyId: text('family_id').notNull().references(() => families.id), userId: text('user_id'), name: text('name').notNull(), email: text('email'), role: text('role', { enum: ['admin', 'member', 'child'] }).notNull().default('member'), color: text('color').notNull().default('#a3e635'), points: integer('points').notNull().default(0),
}, (table) => [uniqueIndex('idx_members_family_user').on(table.familyId, table.userId)]);
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(), familyId: text('family_id').notNull().references(() => families.id), title: text('title').notNull(), sourceUrl: text('source_url'), imageUrl: text('image_url'), description: text('description'), duration: integer('duration'), prepTime: integer('prep_time'), cookTime: integer('cook_time'), servings: integer('servings').notNull().default(4), ingredients: text('ingredients').notNull(), instructions: text('instructions').notNull().default('[]'),
});
export const shoppingItems = sqliteTable('shopping_items', {
  id: text('id').primaryKey(), familyId: text('family_id').notNull().references(() => families.id), name: text('name').notNull(), quantity: text('quantity'), category: text('category'), checked: integer('checked', { mode: 'boolean' }).notNull().default(false), recipeId: text('recipe_id').references(() => recipes.id),
});
export const productCatalog = sqliteTable('product_catalog', {
  id: text('id').primaryKey(), name: text('name').notNull(), category: text('category').notNull(), defaultQuantity: text('default_quantity'),
}, (table) => [uniqueIndex('idx_product_catalog_name').on(table.name)]);
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), familyId: text('family_id').notNull().references(() => families.id), name: text('name').notNull(), icon: text('icon'),
});
export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(), projectId: text('project_id').notNull().references(() => projects.id), title: text('title').notNull(), completed: integer('completed', { mode: 'boolean' }).notNull().default(false), assignedMemberId: text('assigned_member_id').references(() => members.id), dueAt: integer('due_at', { mode: 'timestamp' }),
});
export const events = sqliteTable('events', {
  id: text('id').primaryKey(), familyId: text('family_id').notNull().references(() => families.id), title: text('title').notNull(), startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(), endsAt: integer('ends_at', { mode: 'timestamp' }), memberId: text('member_id').references(() => members.id), isShared: integer('is_shared', { mode: 'boolean' }).notNull().default(false), allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
});
export const chores = sqliteTable('chores', {
  id: text('id').primaryKey(), familyId: text('family_id').notNull().references(() => families.id), title: text('title').notNull(), assignedMemberId: text('assigned_member_id').references(() => members.id), dueAt: integer('due_at', { mode: 'timestamp' }).notNull(), repeatRule: text('repeat_rule'), points: integer('points').notNull().default(1), completedAt: integer('completed_at', { mode: 'timestamp' }),
});
export const emailSettings = sqliteTable('email_settings', {
  familyId: text('family_id').primaryKey().references(() => families.id),
  provider: text('provider').notNull().default('resend'),
  senderName: text('sender_name').notNull().default('Family Base'),
  senderEmail: text('sender_email').notNull().default(''),
  replyTo: text('reply_to').notNull().default(''),
  leadMinutes: integer('lead_minutes').notNull().default(1440),
  overdueEnabled: integer('overdue_enabled', { mode: 'boolean' }).notNull().default(true),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  lastTestAt: integer('last_test_at', { mode: 'timestamp' }),
  lastTestStatus: text('last_test_status'),
});
export const emailDeliveries = sqliteTable('email_deliveries', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id),
  choreId: text('chore_id').notNull().references(() => chores.id),
  recipientEmail: text('recipient_email').notNull(),
  kind: text('kind').notNull(),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('idx_email_delivery_once').on(table.choreId, table.recipientEmail, table.kind, table.dueAt)]);
export const deviceTokens = sqliteTable('device_tokens', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id),
  memberId: text('member_id').notNull().references(() => members.id),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
});
