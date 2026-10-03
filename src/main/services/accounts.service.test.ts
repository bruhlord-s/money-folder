import { beforeEach, describe, expect, it } from 'vitest'
import { accountInputSchema, type AccountInput } from '@shared/accounts'
import { noopLogger } from '@shared/logger'
import type { Db } from '../db/client'
import { DomainError } from '../errors'
import { createTestDb } from '../testing/test-db'
import { createAccountsService, type AccountsService } from './accounts.service'
import { createFamilyMembersService, type FamilyMembersService } from './family-members.service'
import { createTagsService } from './tags.service'

const NOW = new Date('2026-10-03T12:00:00Z')

function input(overrides: Partial<AccountInput> = {}): ReturnType<typeof accountInputSchema.parse> {
  return accountInputSchema.parse({
    name: 'Main card',
    lastFour: null,
    ownerId: null,
    tagNames: [],
    ...overrides
  })
}

describe('accounts service', () => {
  let db: Db
  let accounts: AccountsService
  let members: FamilyMembersService

  beforeEach(() => {
    db = createTestDb()
    const deps = { db, logger: noopLogger, now: () => NOW }
    accounts = createAccountsService(deps)
    members = createFamilyMembersService(deps)
  })

  it('creates an account with owner and tags', () => {
    const owner = members.create({ name: 'Mom' })
    const account = accounts.create(
      input({ lastFour: '1234', ownerId: owner.id, tagNames: ['daily', 'cards'] })
    )

    expect(account).toMatchObject({
      name: 'Main card',
      lastFour: '1234',
      owner: { id: owner.id, name: 'Mom' },
      archived: false,
      createdAt: NOW.getTime()
    })
    expect(account.tags.map((t) => t.name)).toEqual(['cards', 'daily'])
  })

  it('reuses existing tags regardless of case, including non-ASCII names', () => {
    const first = accounts.create(input({ tagNames: ['Семья'] }))
    const second = accounts.create(input({ name: 'Savings', tagNames: ['семья', 'SEMYA'] }))

    expect(second.tags.find((t) => t.name === 'Семья')?.id).toBe(first.tags[0]?.id)
    expect(
      createTagsService({ db })
        .list()
        .map((t) => t.name)
    ).toEqual(['SEMYA', 'Семья'])
  })

  it('replaces tags and fields on update', () => {
    const account = accounts.create(input({ tagNames: ['old', 'kept'] }))
    const updated = accounts.update(
      account.id,
      input({ name: 'Renamed', lastFour: '9876', tagNames: ['kept', 'new'] })
    )

    expect(updated.name).toBe('Renamed')
    expect(updated.lastFour).toBe('9876')
    expect(updated.tags.map((t) => t.name)).toEqual(['kept', 'new'])
  })

  it('hides archived accounts unless asked, and unarchives', () => {
    const active = accounts.create(input({ name: 'Active' }))
    const old = accounts.create(input({ name: 'Old' }))

    expect(accounts.setArchived(old.id, true).archived).toBe(true)
    expect(accounts.list({ includeArchived: false }).map((a) => a.id)).toEqual([active.id])
    expect(accounts.list({ includeArchived: true })).toHaveLength(2)

    accounts.setArchived(old.id, false)
    expect(accounts.list({ includeArchived: false })).toHaveLength(2)
  })

  it('deletes an account together with its tag links but keeps the tags', () => {
    const account = accounts.create(input({ tagNames: ['travel'] }))
    accounts.remove(account.id)

    expect(accounts.list({ includeArchived: true })).toEqual([])
    expect(db.$client.prepare('SELECT count(*) FROM account_tags').pluck().get()).toBe(0)
    expect(createTagsService({ db }).list()).toHaveLength(1)
  })

  it('rejects unknown accounts and owners with NOT_FOUND and saves nothing', () => {
    const expectNotFound = (fn: () => unknown): void => {
      expect(fn).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }) as DomainError)
    }
    expectNotFound(() => accounts.update(999, input()))
    expectNotFound(() => accounts.setArchived(999, true))
    expectNotFound(() => accounts.remove(999))
    expectNotFound(() => accounts.create(input({ ownerId: 999, tagNames: ['orphan'] })))

    expect(accounts.list({ includeArchived: true })).toEqual([])
    expect(createTagsService({ db }).list()).toEqual([])
  })

  it('enforces the four-digit check in the database too', () => {
    expect(() =>
      accounts.create({ name: 'Bad', lastFour: '12a4', ownerId: null, tagNames: [] })
    ).toThrow()
  })
})
