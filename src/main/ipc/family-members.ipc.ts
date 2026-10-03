import { z } from 'zod'
import { idSchema } from '@shared/accounts'
import { memberInputSchema } from '@shared/family-members'
import type { Logger } from '@shared/logger'
import type { FamilyMembersService } from '../services/family-members.service'
import { createHandler, type HandlerEntry } from './handler'

export function familyMembersHandlers(
  members: FamilyMembersService,
  logger: Logger
): HandlerEntry[] {
  return [
    createHandler('members:list', z.null(), () => members.list(), logger),
    createHandler('members:create', memberInputSchema, (input) => members.create(input), logger),
    createHandler(
      'members:rename',
      z.object({ id: idSchema, input: memberInputSchema }),
      ({ id, input }) => members.rename(id, input),
      logger
    ),
    createHandler(
      'members:delete',
      z.object({ id: idSchema }),
      ({ id }) => {
        members.remove(id)
        return null
      },
      logger
    )
  ]
}
