import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const familyMembers = sqliteTable('family_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  /** Case-folded name for uniqueness (SQLite's lower() only folds ASCII). See nameKey(). */
  nameKey: text('name_key').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
})
