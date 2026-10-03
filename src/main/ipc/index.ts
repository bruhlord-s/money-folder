import { ipcMain } from 'electron'
import { z } from 'zod'
import type { Container } from '../container'
import { accountsHandlers } from './accounts.ipc'
import { familyMembersHandlers } from './family-members.ipc'
import { createHandler } from './handler'

export function registerIpcHandlers({ services, logger }: Container): void {
  const log = logger.child('ipc')
  const handlers = [
    ...accountsHandlers(services.accounts, log),
    ...familyMembersHandlers(services.members, log),
    createHandler('tags:list', z.null(), () => services.tags.list(), log)
  ]
  for (const [channel, handler] of handlers) {
    ipcMain.handle(channel, (_event, rawInput: unknown) => handler(rawInput))
  }
}
