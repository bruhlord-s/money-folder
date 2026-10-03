import { beforeEach, describe, expect, it } from 'vitest'
import { noopLogger } from '@shared/logger'
import { createTestDb } from '../testing/test-db'
import { createAccountsService, type AccountsService } from './accounts.service'
import { createFamilyMembersService, type FamilyMembersService } from './family-members.service'

describe('family members service', () => {
  let members: FamilyMembersService
  let accounts: AccountsService

  beforeEach(() => {
    const deps = { db: createTestDb(), logger: noopLogger, now: () => new Date(0) }
    members = createFamilyMembersService(deps)
    accounts = createAccountsService(deps)
  })

  it('rejects duplicate names case-insensitively, including Cyrillic', () => {
    members.create({ name: 'Мама' })
    expect(() => members.create({ name: 'мама' })).toThrow(
      expect.objectContaining({ code: 'CONFLICT' }) as Error
    )
  })

  it('allows renaming to a different case of the same name but not to a taken one', () => {
    const dad = members.create({ name: 'dad' })
    members.create({ name: 'Mom' })

    expect(members.rename(dad.id, { name: 'Dad' }).name).toBe('Dad')
    expect(() => members.rename(dad.id, { name: 'mom' })).toThrow(
      expect.objectContaining({ code: 'CONFLICT' }) as Error
    )
  })

  it('clears the owner of their accounts when a member is deleted', () => {
    const mom = members.create({ name: 'Mom' })
    const account = accounts.create({ name: 'Card', lastFour: null, ownerId: mom.id, tagNames: [] })

    members.remove(mom.id)

    expect(members.list()).toEqual([])
    expect(accounts.list({ includeArchived: true })).toEqual([
      expect.objectContaining({ id: account.id, owner: null })
    ])
  })

  it('reports NOT_FOUND for unknown members', () => {
    expect(() => members.rename(42, { name: 'X' })).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }) as Error
    )
    expect(() => members.remove(42)).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }) as Error
    )
  })
})
