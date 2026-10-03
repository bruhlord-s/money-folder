import { asc, eq, inArray } from 'drizzle-orm'
import type { TagDto } from '@shared/tags'
import type { Executor } from '../db/client'
import { nameKey } from '../db/name-key'
import { accountTags, tags } from '../db/schema'

export function listTags(ex: Executor): TagDto[] {
  return ex.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)).all()
}

/** Makes sure a tag exists for each name (matched case-insensitively) and returns their ids. */
export function upsertTagsByName(ex: Executor, names: string[]): number[] {
  if (names.length === 0) return []
  ex.insert(tags)
    .values(names.map((name) => ({ name, nameKey: nameKey(name) })))
    .onConflictDoNothing()
    .run()
  return ex
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.nameKey, names.map(nameKey)))
    .all()
    .map((row) => row.id)
}

export function replaceAccountTags(ex: Executor, accountId: number, tagIds: number[]): void {
  ex.delete(accountTags).where(eq(accountTags.accountId, accountId)).run()
  if (tagIds.length === 0) return
  ex.insert(accountTags)
    .values(tagIds.map((tagId) => ({ accountId, tagId })))
    .run()
}
