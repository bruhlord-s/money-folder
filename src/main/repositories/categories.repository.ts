import { asc, eq } from 'drizzle-orm'
import type { CategoryDto } from '@shared/transactions'
import type { Executor } from '../db/client'
import { nameKey } from '../db/name-key'
import { categories } from '../db/schema'

export function listCategories(ex: Executor): CategoryDto[] {
  return ex
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name))
    .all()
}

/** Returns the id of the category with this name (matched case-insensitively), creating it if needed. */
export function upsertCategoryByName(ex: Executor, name: string): number {
  ex.insert(categories)
    .values({ name, nameKey: nameKey(name) })
    .onConflictDoNothing()
    .run()
  const row = ex
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.nameKey, nameKey(name)))
    .get()
  if (!row) throw new Error('category upsert lost its row')
  return row.id
}
