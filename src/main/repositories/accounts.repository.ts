import { asc, eq, inArray, isNull, type SQL } from 'drizzle-orm'
import type { AccountDto } from '@shared/accounts'
import type { TagDto } from '@shared/tags'
import type { Executor } from '../db/client'
import { accounts, accountTags, familyMembers, tags } from '../db/schema'

interface AccountValues {
  name: string
  lastFour: string | null
  ownerId: number | null
}

export function listAccounts(
  ex: Executor,
  { includeArchived }: { includeArchived: boolean }
): AccountDto[] {
  return selectAccounts(ex, includeArchived ? undefined : isNull(accounts.archivedAt))
}

export function findAccount(ex: Executor, id: number): AccountDto | undefined {
  return selectAccounts(ex, eq(accounts.id, id))[0]
}

export function insertAccount(ex: Executor, values: AccountValues, now: Date): number {
  return ex
    .insert(accounts)
    .values({ ...values, createdAt: now, updatedAt: now })
    .returning({ id: accounts.id })
    .get().id
}

/** Returns false if there was no such account. */
export function updateAccount(ex: Executor, id: number, values: AccountValues, now: Date): boolean {
  const { changes } = ex
    .update(accounts)
    .set({ ...values, updatedAt: now })
    .where(eq(accounts.id, id))
    .run()
  return changes > 0
}

/** Returns false if there was no such account. */
export function setAccountArchivedAt(
  ex: Executor,
  id: number,
  archivedAt: Date | null,
  now: Date
): boolean {
  const { changes } = ex
    .update(accounts)
    .set({ archivedAt, updatedAt: now })
    .where(eq(accounts.id, id))
    .run()
  return changes > 0
}

/** Returns false if there was no such account. Tag links go with it (ON DELETE CASCADE). */
export function deleteAccount(ex: Executor, id: number): boolean {
  return ex.delete(accounts).where(eq(accounts.id, id)).run().changes > 0
}

function selectAccounts(ex: Executor, where: SQL | undefined): AccountDto[] {
  const rows = ex
    .select({
      id: accounts.id,
      name: accounts.name,
      lastFour: accounts.lastFour,
      archivedAt: accounts.archivedAt,
      createdAt: accounts.createdAt,
      owner: { id: familyMembers.id, name: familyMembers.name }
    })
    .from(accounts)
    .leftJoin(familyMembers, eq(accounts.ownerId, familyMembers.id))
    .where(where)
    .orderBy(asc(accounts.name), asc(accounts.id))
    .all()

  const tagsByAccount = loadTags(
    ex,
    rows.map((row) => row.id)
  )
  return rows.map(({ archivedAt, createdAt, ...row }) => ({
    ...row,
    tags: tagsByAccount.get(row.id) ?? [],
    archived: archivedAt !== null,
    createdAt: createdAt.getTime()
  }))
}

function loadTags(ex: Executor, accountIds: number[]): Map<number, TagDto[]> {
  const byAccount = new Map<number, TagDto[]>()
  if (accountIds.length === 0) return byAccount
  const links = ex
    .select({ accountId: accountTags.accountId, id: tags.id, name: tags.name })
    .from(accountTags)
    .innerJoin(tags, eq(accountTags.tagId, tags.id))
    .where(inArray(accountTags.accountId, accountIds))
    .orderBy(asc(tags.name))
    .all()
  for (const { accountId, id, name } of links) {
    const list = byAccount.get(accountId) ?? []
    list.push({ id, name })
    byAccount.set(accountId, list)
  }
  return byAccount
}
