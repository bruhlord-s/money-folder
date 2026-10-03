import type { AccountDto, ValidAccountInput } from '@shared/accounts'
import type { Logger } from '@shared/logger'
import type { Db, Executor } from '../db/client'
import { DomainError } from '../errors'
import {
  deleteAccount,
  findAccount,
  insertAccount,
  listAccounts,
  setAccountArchivedAt,
  updateAccount
} from '../repositories/accounts.repository'
import { findMember } from '../repositories/family-members.repository'
import { replaceAccountTags, upsertTagsByName } from '../repositories/tags.repository'

export interface AccountsService {
  list(options: { includeArchived: boolean }): AccountDto[]
  create(input: ValidAccountInput): AccountDto
  update(id: number, input: ValidAccountInput): AccountDto
  setArchived(id: number, archived: boolean): AccountDto
  remove(id: number): void
}

interface Deps {
  db: Db
  logger: Logger
  now: () => Date
}

export function createAccountsService({ db, logger, now }: Deps): AccountsService {
  const log = logger.child('accounts')

  function notFound(id: number): DomainError {
    return new DomainError('NOT_FOUND', `account ${id} not found`)
  }

  function getAccount(ex: Executor, id: number): AccountDto {
    const account = findAccount(ex, id)
    if (!account) throw notFound(id)
    return account
  }

  function assertOwnerExists(ex: Executor, ownerId: number | null): void {
    if (ownerId !== null && !findMember(ex, ownerId)) {
      throw new DomainError('NOT_FOUND', `family member ${ownerId} not found`)
    }
  }

  function saveTags(ex: Executor, accountId: number, tagNames: string[]): void {
    replaceAccountTags(ex, accountId, upsertTagsByName(ex, tagNames))
  }

  return {
    list: (options) => listAccounts(db, options),

    create({ tagNames, ...values }) {
      const account = db.transaction((tx) => {
        assertOwnerExists(tx, values.ownerId)
        const id = insertAccount(tx, values, now())
        saveTags(tx, id, tagNames)
        return getAccount(tx, id)
      })
      log.info('account created', { accountId: account.id })
      return account
    },

    update(id, { tagNames, ...values }) {
      const account = db.transaction((tx) => {
        assertOwnerExists(tx, values.ownerId)
        if (!updateAccount(tx, id, values, now())) throw notFound(id)
        saveTags(tx, id, tagNames)
        return getAccount(tx, id)
      })
      log.info('account updated', { accountId: id })
      return account
    },

    setArchived(id, archived) {
      const at = now()
      if (!setAccountArchivedAt(db, id, archived ? at : null, at)) throw notFound(id)
      log.info(archived ? 'account archived' : 'account unarchived', { accountId: id })
      return getAccount(db, id)
    },

    remove(id) {
      if (!deleteAccount(db, id)) throw notFound(id)
      log.info('account deleted', { accountId: id })
    }
  }
}
