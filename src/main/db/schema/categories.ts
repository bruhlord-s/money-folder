import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
// Keep in sync with CATEGORY_KINDS in @shared/transactions (drizzle-kit can't resolve the alias).
const KINDS = ['expense', 'income'] as const

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Expense and income categories are separate lists: "Salary" is never offered for groceries. */
    kind: text('kind', { enum: KINDS }).notNull(),
    name: text('name').notNull(),
    /** Case-folded name for uniqueness (SQLite's lower() only folds ASCII). See nameKey(). */
    nameKey: text('name_key').notNull()
  },
  (t) => [
    check('categories_kind', sql`${t.kind} IN ('expense', 'income')`),
    uniqueIndex('categories_kind_name_key_unique').on(t.kind, t.nameKey)
  ]
)
