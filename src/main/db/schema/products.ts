import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
// Relative, not @shared: drizzle-kit loads this file and can't resolve the alias.
import { PRODUCT_UNITS } from '../../../shared/transactions'
import { oneOf } from './one-of'

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    /** Case-folded name for matching. See nameKey(). */
    nameKey: text('name_key').notNull(),
    brand: text('brand'),
    /** Case-folded brand; '' when there is no brand, so it takes part in the unique index. */
    brandKey: text('brand_key').notNull().default(''),
    /** Package size in thousandths of `unit` (1 l → 1000), or null for loose goods. */
    size: integer('size'),
    /** `size` or 0; NULLs never collide in a unique index, so the index uses this instead. */
    sizeKey: integer('size_key').notNull().default(0),
    unit: text('unit', { enum: PRODUCT_UNITS }).notNull()
  },
  (t) => [
    check('products_size_positive', sql`${t.size} > 0`),
    check('products_unit', oneOf(t.unit, PRODUCT_UNITS)),
    uniqueIndex('products_identity_unique').on(t.nameKey, t.brandKey, t.sizeKey, t.unit)
  ]
)
