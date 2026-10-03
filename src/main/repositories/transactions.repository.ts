import { asc, desc, eq, or, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { TransactionDto, TransactionKind, TransactionLineDto } from '@shared/transactions'
import type { Executor } from '../db/client'
import { accounts, categories, products, transactionLines, transactions } from '../db/schema'
import { productColumns } from './products.repository'

export interface TransactionValues {
  kind: TransactionKind
  accountId: number
  toAccountId: number | null
  categoryId: number | null
  occurredOn: string
  note: string | null
}

const toAccounts = alias(accounts, 'to_accounts')

interface LineValues {
  productId: number | null
  quantity: number
  amount: number
}

/** Newest first. */
export function listTransactions(ex: Executor): TransactionDto[] {
  return selectTransactions(ex, undefined)
}

export function findTransaction(ex: Executor, id: number): TransactionDto | undefined {
  return selectTransactions(ex, eq(transactions.id, id))[0]
}

export function insertTransaction(ex: Executor, values: TransactionValues, now: Date): number {
  return ex
    .insert(transactions)
    .values({ ...values, createdAt: now, updatedAt: now })
    .returning({ id: transactions.id })
    .get().id
}

/** Returns false if there was no such transaction. */
export function updateTransaction(
  ex: Executor,
  id: number,
  values: TransactionValues,
  now: Date
): boolean {
  const { changes } = ex
    .update(transactions)
    .set({ ...values, updatedAt: now })
    .where(eq(transactions.id, id))
    .run()
  return changes > 0
}

export function replaceLines(ex: Executor, transactionId: number, lines: LineValues[]): void {
  ex.delete(transactionLines).where(eq(transactionLines.transactionId, transactionId)).run()
  ex.insert(transactionLines)
    .values(lines.map((line) => ({ ...line, transactionId })))
    .run()
}

/** Returns false if there was no such transaction. Lines go with it (ON DELETE CASCADE). */
export function deleteTransaction(ex: Executor, id: number): boolean {
  return ex.delete(transactions).where(eq(transactions.id, id)).run().changes > 0
}

/** Whether the account is used by any transaction, on either side of a transfer. */
export function accountHasTransactions(ex: Executor, accountId: number): boolean {
  const row = ex
    .select({ id: transactions.id })
    .from(transactions)
    .where(or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)))
    .limit(1)
    .get()
  return row !== undefined
}

function selectTransactions(ex: Executor, where: SQL | undefined): TransactionDto[] {
  const rows = ex
    .select({
      id: transactions.id,
      kind: transactions.kind,
      occurredOn: transactions.occurredOn,
      note: transactions.note,
      account: { id: accounts.id, name: accounts.name },
      toAccount: { id: toAccounts.id, name: toAccounts.name },
      category: { id: categories.id, kind: categories.kind, name: categories.name }
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(toAccounts, eq(transactions.toAccountId, toAccounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(where)
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .all()

  const linesByTransaction =
    rows.length === 0 ? new Map<number, TransactionLineDto[]>() : loadLines(ex, where)
  return rows.map((row) => {
    const lines = linesByTransaction.get(row.id) ?? []
    return {
      ...row,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      lines
    }
  })
}

/**
 * Lines of the transactions matching `where`. Filters through a join rather than a list of ids,
 * which would hit SQLite's limit on bound parameters once there are tens of thousands of rows.
 */
function loadLines(ex: Executor, where: SQL | undefined): Map<number, TransactionLineDto[]> {
  const byTransaction = new Map<number, TransactionLineDto[]>()
  const rows = ex
    .select({
      transactionId: transactionLines.transactionId,
      id: transactionLines.id,
      quantity: transactionLines.quantity,
      amount: transactionLines.amount,
      product: productColumns
    })
    .from(transactionLines)
    .innerJoin(transactions, eq(transactionLines.transactionId, transactions.id))
    .leftJoin(products, eq(transactionLines.productId, products.id))
    .where(where)
    .orderBy(asc(transactionLines.id))
    .all()
  for (const { transactionId, ...line } of rows) {
    const list = byTransaction.get(transactionId) ?? []
    list.push(line)
    byTransaction.set(transactionId, list)
  }
  return byTransaction
}
