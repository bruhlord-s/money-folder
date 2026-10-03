import { and, asc, eq } from 'drizzle-orm'
import type { CategoryDto, CategoryKind } from '@shared/transactions'
import type { Executor } from '../db/client'
import { nameKey } from '../db/name-key'
import { categories } from '../db/schema'

export function listCategories(ex: Executor, kind: CategoryKind): CategoryDto[] {
  return ex
    .select({ id: categories.id, kind: categories.kind, name: categories.name })
    .from(categories)
    .where(eq(categories.kind, kind))
    .orderBy(asc(categories.name))
    .all()
}

/**
 * Returns the id of the category of this kind with this name (matched case-insensitively),
 * creating it if needed.
 */
export function upsertCategoryByName(ex: Executor, kind: CategoryKind, name: string): number {
  const key = nameKey(name)
  ex.insert(categories).values({ kind, name, nameKey: key }).onConflictDoNothing().run()
  const row = ex
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.kind, kind), eq(categories.nameKey, key)))
    .get()
  if (!row) throw new Error('category upsert lost its row')
  return row.id
}
