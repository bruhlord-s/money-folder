import { sql } from 'drizzle-orm'
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { familyMembers } from './family-members'
import { tags } from './tags'

export const accounts = sqliteTable(
  'accounts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    /** Last four digits of the card, if the account has one. */
    lastFour: text('last_four'),
    ownerId: integer('owner_id').references(() => familyMembers.id, { onDelete: 'set null' }),
    archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [
    check('accounts_last_four_digits', sql`${t.lastFour} GLOB '[0-9][0-9][0-9][0-9]'`),
    index('accounts_owner_id_idx').on(t.ownerId)
  ]
)

export const accountTags = sqliteTable(
  'account_tags',
  {
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' })
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.tagId] }),
    index('account_tags_tag_id_idx').on(t.tagId)
  ]
)
