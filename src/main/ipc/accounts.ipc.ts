import { z } from 'zod'
import { accountInputSchema, idSchema } from '@shared/accounts'
import type { Logger } from '@shared/logger'
import type { AccountsService } from '../services/accounts.service'
import { createHandler, type HandlerEntry } from './handler'

export function accountsHandlers(accounts: AccountsService, logger: Logger): HandlerEntry[] {
  return [
    createHandler(
      'accounts:list',
      z.object({ includeArchived: z.boolean() }),
      (options) => accounts.list(options),
      logger
    ),
    createHandler('accounts:create', accountInputSchema, (input) => accounts.create(input), logger),
    createHandler(
      'accounts:update',
      z.object({ id: idSchema, input: accountInputSchema }),
      ({ id, input }) => accounts.update(id, input),
      logger
    ),
    createHandler(
      'accounts:setArchived',
      z.object({ id: idSchema, archived: z.boolean() }),
      ({ id, archived }) => accounts.setArchived(id, archived),
      logger
    ),
    createHandler(
      'accounts:delete',
      z.object({ id: idSchema }),
      ({ id }) => {
        accounts.remove(id)
        return null
      },
      logger
    )
  ]
}
