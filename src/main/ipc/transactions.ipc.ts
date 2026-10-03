import { z } from 'zod'
import { idSchema } from '@shared/common'
import type { Logger } from '@shared/logger'
import { transactionInputSchema } from '@shared/transactions'
import type { TransactionsService } from '../services/transactions.service'
import { createHandler, type HandlerEntry } from './handler'

export function transactionsHandlers(
  transactions: TransactionsService,
  logger: Logger
): HandlerEntry[] {
  return [
    createHandler('transactions:list', z.null(), () => transactions.list(), logger),
    createHandler(
      'transactions:create',
      transactionInputSchema,
      (input) => transactions.create(input),
      logger
    ),
    createHandler(
      'transactions:update',
      z.object({ id: idSchema, input: transactionInputSchema }),
      ({ id, input }) => transactions.update(id, input),
      logger
    ),
    createHandler(
      'transactions:delete',
      z.object({ id: idSchema }),
      ({ id }) => {
        transactions.remove(id)
        return null
      },
      logger
    )
  ]
}
