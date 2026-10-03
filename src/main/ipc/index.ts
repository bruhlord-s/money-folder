import { ipcMain } from 'electron'
import { z } from 'zod'
import { CATEGORY_KINDS } from '@shared/transactions'
import type { Container } from '../container'
import { accountsHandlers } from './accounts.ipc'
import { familyMembersHandlers } from './family-members.ipc'
import { createHandler } from './handler'
import { transactionsHandlers } from './transactions.ipc'

export function registerIpcHandlers({ services, logger }: Container): void {
  const log = logger.child('ipc')
  const handlers = [
    ...accountsHandlers(services.accounts, log),
    ...familyMembersHandlers(services.members, log),
    ...transactionsHandlers(services.transactions, log),
    createHandler('tags:list', z.null(), () => services.tags.list(), log),
    createHandler(
      'categories:list',
      z.object({ kind: z.enum(CATEGORY_KINDS) }),
      ({ kind }) => services.categories.list(kind),
      log
    ),
    createHandler('products:list', z.null(), () => services.products.list(), log)
  ]
  for (const [channel, handler] of handlers) {
    ipcMain.handle(channel, (_event, rawInput: unknown) => handler(rawInput))
  }
}
