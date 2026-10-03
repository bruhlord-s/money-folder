import type { Logger } from '@shared/logger'
import type { TransactionDto, ValidTransactionInput } from '@shared/transactions'
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

  /** Checks the account and resolves names to ids, creating categories and products on first use. */
  function prepare(
    ex: Executor,
    { accountId, categoryName, occurredAt, note }: ValidTransactionInput
  ): TransactionValues {
    if (!findAccount(ex, accountId)) {
      throw new DomainError('NOT_FOUND', `account ${accountId} not found`)
    }
    return {
      accountId,
      categoryId: upsertCategoryByName(ex, categoryName),
      occurredAt: new Date(occurredAt),
      note
    }
  }

  function saveLines(
    ex: Executor,
    transactionId: number,
    lines: ValidTransactionInput['lines']
  ): void {
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
        saveLines(tx, id, input.lines)
        return getTransaction(tx, id)
      })
      log.info('transaction created', { transactionId: transaction.id })
      return transaction
    },

    update(id, input) {
      const transaction = db.transaction((tx) => {
        if (!updateTransaction(tx, id, prepare(tx, input), now())) throw notFound(id)
        saveLines(tx, id, input.lines)
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
