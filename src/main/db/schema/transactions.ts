import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { accounts } from './accounts'
import { categories } from './categories'
import { products } from './products'
// Keep in sync with TRANSACTION_KINDS in @shared/transactions (drizzle-kit can't resolve the alias).
const KINDS = ['expense', 'income', 'transfer'] as const

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Amounts are always positive; the kind gives the direction. */
    kind: text('kind', { enum: KINDS }).notNull(),
    /** The account the money leaves (expense, transfer) or arrives at (income). */
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    /** Transfers only: the account the money arrives at. */
    toAccountId: integer('to_account_id').references(() => accounts.id, { onDelete: 'restrict' }),
    /** Null for transfers. Its kind matches the transaction's kind. */
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'restrict' }),
    /** A local calendar date, 'YYYY-MM-DD'. Not an instant, so it never shifts with the timezone. */
    occurredOn: text('occurred_on').notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => [
    check('transactions_kind', sql`${t.kind} IN ('expense', 'income', 'transfer')`),
    check(
      'transactions_transfer_target',
      sql`(${t.kind} = 'transfer') = (${t.toAccountId} IS NOT NULL)`
    ),
    check('transactions_transfer_other_account', sql`${t.toAccountId} <> ${t.accountId}`),
    check('transactions_category', sql`(${t.kind} = 'transfer') = (${t.categoryId} IS NULL)`),
    check(
      'transactions_occurred_on_date',
      sql`${t.occurredOn} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'`
    ),
    index('transactions_account_id_idx').on(t.accountId),
    index('transactions_to_account_id_idx').on(t.toAccountId),
    index('transactions_category_id_idx').on(t.categoryId),
    index('transactions_occurred_on_idx').on(t.occurredOn)
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
