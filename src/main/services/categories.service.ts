import type { CategoryDto } from '@shared/transactions'
import type { Db } from '../db/client'
import { listCategories } from '../repositories/categories.repository'

export interface CategoriesService {
  list(): CategoryDto[]
}

export function createCategoriesService({ db }: { db: Db }): CategoriesService {
  return {
    list: () => listCategories(db)
  }
}
