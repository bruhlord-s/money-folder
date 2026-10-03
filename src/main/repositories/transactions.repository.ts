import { asc, desc, eq, inArray, type SQL } from 'drizzle-orm'
import type { TransactionDto, TransactionLineDto } from '@shared/transactions'
import type { Executor } from '../db/client'
import { accounts, categories, products, transactionLines, transactions } from '../db/schema'
import { productColumns } from './products.repository'

export interface TransactionValues {
  accountId: number
  categoryId: number
  occurredAt: Date
  note: string | null
}

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

export function accountHasTransactions(ex: Executor, accountId: number): boolean {
  const row = ex
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .limit(1)
    .get()
  return row !== undefined
}

function selectTransactions(ex: Executor, where: SQL | undefined): TransactionDto[] {
  const rows = ex
    .select({
      id: transactions.id,
      occurredAt: transactions.occurredAt,
      note: transactions.note,
      account: { id: accounts.id, name: accounts.name },
      category: { id: categories.id, name: categories.name }
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(where)
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .all()

  const linesByTransaction = loadLines(
    ex,
    rows.map((row) => row.id)
  )
  return rows.map(({ occurredAt, ...row }) => {
    const lines = linesByTransaction.get(row.id) ?? []
    return {
      ...row,
      occurredAt: occurredAt.getTime(),
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      lines
    }
  })
}

function loadLines(ex: Executor, transactionIds: number[]): Map<number, TransactionLineDto[]> {
  const byTransaction = new Map<number, TransactionLineDto[]>()
  if (transactionIds.length === 0) return byTransaction
  const rows = ex
    .select({
      transactionId: transactionLines.transactionId,
      id: transactionLines.id,
      quantity: transactionLines.quantity,
      amount: transactionLines.amount,
      product: productColumns
    })
    .from(transactionLines)
    .leftJoin(products, eq(transactionLines.productId, products.id))
    .where(inArray(transactionLines.transactionId, transactionIds))
    .orderBy(asc(transactionLines.id))
    .all()
  for (const { transactionId, ...line } of rows) {
    const list = byTransaction.get(transactionId) ?? []
    list.push(line)
    byTransaction.set(transactionId, list)
  }
  return byTransaction
}
