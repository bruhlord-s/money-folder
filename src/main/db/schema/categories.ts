import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
// Relative, not @shared: drizzle-kit loads this file and can't resolve the alias.
import { CATEGORY_KINDS } from '../../../shared/transactions'
import { oneOf } from './one-of'

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Expense and income categories are separate lists: "Salary" is never offered for groceries. */
    kind: text('kind', { enum: CATEGORY_KINDS }).notNull(),
    name: text('name').notNull(),
    /** Case-folded name for uniqueness (SQLite's lower() only folds ASCII). See nameKey(). */
    nameKey: text('name_key').notNull()
  },
  (t) => [
    check('categories_kind', oneOf(t.kind, CATEGORY_KINDS)),
    uniqueIndex('categories_kind_name_key_unique').on(t.kind, t.nameKey)
  ]
)
