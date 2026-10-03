import type { CategoryDto, CategoryKind } from '@shared/transactions'
import type { Db } from '../db/client'
import { listCategories } from '../repositories/categories.repository'

export interface CategoriesService {
  list(kind: CategoryKind): CategoryDto[]
}

export function createCategoriesService({ db }: { db: Db }): CategoriesService {
  return {
    list: (kind) => listCategories(db, kind)
  }
}
