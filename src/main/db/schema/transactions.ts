import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { accounts } from './accounts'
import { categories } from './categories'
import { products } from './products'

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [
    index('transactions_account_id_idx').on(t.accountId),
    index('transactions_category_id_idx').on(t.categoryId),
    index('transactions_occurred_at_idx').on(t.occurredAt)
  ]
)

/** Receipt lines. The transaction total is the sum of its lines and is never stored. */
export const transactionLines = sqliteTable(
  'transaction_lines',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transactionId: integer('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'restrict' }),
    /** In thousandths: 3 packs → 3000, 0.75 kg → 750. */
    quantity: integer('quantity').notNull().default(1000),
    /** Line total in kopecks, after discounts. */
    amount: integer('amount').notNull()
  },
  (t) => [
    check('transaction_lines_quantity_positive', sql`${t.quantity} > 0`),
    check('transaction_lines_amount_positive', sql`${t.amount} > 0`),
    index('transaction_lines_transaction_id_idx').on(t.transactionId),
    index('transaction_lines_product_id_idx').on(t.productId)
  ]
)
