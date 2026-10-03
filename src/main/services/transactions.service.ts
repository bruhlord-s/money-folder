import type { Logger } from '@shared/logger'
import { MILLI, type TransactionDto, type ValidTransactionInput } from '@shared/transactions'
import type { Db, Executor } from '../db/client'
import { DomainError } from '../errors'
import { findAccount } from '../repositories/accounts.repository'
import { upsertCategoryByName } from '../repositories/categories.repository'
import { upsertProduct } from '../repositories/products.repository'
import {
  deleteTransaction,
  findTransaction,
  insertTransaction,
  listTransactions,
  replaceLines,
  updateTransaction,
  type TransactionValues
} from '../repositories/transactions.repository'

export interface TransactionsService {
  list(): TransactionDto[]
  create(input: ValidTransactionInput): TransactionDto
  update(id: number, input: ValidTransactionInput): TransactionDto
  remove(id: number): void
}

interface Deps {
  db: Db
  logger: Logger
  now: () => Date
}

export function createTransactionsService({ db, logger, now }: Deps): TransactionsService {
  const log = logger.child('transactions')

  function notFound(id: number): DomainError {
    return new DomainError('NOT_FOUND', `transaction ${id} not found`)
  }

  function getTransaction(ex: Executor, id: number): TransactionDto {
    const transaction = findTransaction(ex, id)
    if (!transaction) throw notFound(id)
    return transaction
  }

  function assertAccountExists(ex: Executor, accountId: number): void {
    if (!findAccount(ex, accountId)) {
      throw new DomainError('NOT_FOUND', `account ${accountId} not found`)
    }
  }

  /** Checks the accounts and resolves names to ids, creating categories on first use. */
  function prepare(ex: Executor, input: ValidTransactionInput): TransactionValues {
    assertAccountExists(ex, input.accountId)
    const common = { accountId: input.accountId, occurredOn: input.occurredOn, note: input.note }
    if (input.kind === 'transfer') {
      assertAccountExists(ex, input.toAccountId)
      return { ...common, kind: 'transfer', toAccountId: input.toAccountId, categoryId: null }
    }
    return {
      ...common,
      kind: input.kind,
      toAccountId: null,
      categoryId: upsertCategoryByName(ex, input.kind, input.categoryName)
    }
  }

  /** Saves the receipt lines, creating products on first use. A transfer is one plain line. */
  function saveLines(ex: Executor, transactionId: number, input: ValidTransactionInput): void {
    const lines =
      input.kind === 'transfer'
        ? [{ product: null, quantity: MILLI, amount: input.amount }]
        : input.lines
    replaceLines(
      ex,
      transactionId,
      lines.map(({ product, quantity, amount }) => ({
        productId: product ? upsertProduct(ex, product) : null,
        quantity,
        amount
      }))
    )
  }

  return {
    list: () => listTransactions(db),

    create(input) {
      const transaction = db.transaction((tx) => {
        const id = insertTransaction(tx, prepare(tx, input), now())
        saveLines(tx, id, input)
        return getTransaction(tx, id)
      })
      log.info('transaction created', { transactionId: transaction.id })
      return transaction
    },

    update(id, input) {
      const transaction = db.transaction((tx) => {
        if (!updateTransaction(tx, id, prepare(tx, input), now())) throw notFound(id)
        saveLines(tx, id, input)
        return getTransaction(tx, id)
      })
      log.info('transaction updated', { transactionId: id })
      return transaction
    },

    remove(id) {
      if (!deleteTransaction(db, id)) throw notFound(id)
      log.info('transaction deleted', { transactionId: id })
    }
  }
}
