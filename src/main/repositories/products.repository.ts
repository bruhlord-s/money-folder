import { and, asc, eq } from 'drizzle-orm'
import type { ProductDto, ProductInput } from '@shared/transactions'
import type { Executor } from '../db/client'
import { nameKey } from '@shared/common'
import { products } from '../db/schema'

export const productColumns = {
  id: products.id,
  name: products.name,
  brand: products.brand,
  size: products.size,
  unit: products.unit
}

export function listProducts(ex: Executor): ProductDto[] {
  return ex
    .select(productColumns)
    .from(products)
    .orderBy(asc(products.name), asc(products.brand), asc(products.size))
    .all()
}

/**
 * Returns the id of the product with this name, brand, size and unit (names and brands matched
 * case-insensitively), creating it if needed. The first spelling seen is kept.
 */
export function upsertProduct(ex: Executor, { name, brand, size, unit }: ProductInput): number {
  const identity = {
    nameKey: nameKey(name),
    brandKey: brand === null ? '' : nameKey(brand),
    sizeKey: size ?? 0,
    unit
  }
  ex.insert(products)
    .values({ name, brand, size, ...identity })
    .onConflictDoNothing()
    .run()
  const row = ex
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.nameKey, identity.nameKey),
        eq(products.brandKey, identity.brandKey),
        eq(products.sizeKey, identity.sizeKey),
        eq(products.unit, unit)
      )
    )
    .get()
  if (!row) throw new Error('product upsert lost its row')
  return row.id
}
