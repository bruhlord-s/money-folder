import type { ProductDto } from '@shared/transactions'
import type { Db } from '../db/client'
import { listProducts } from '../repositories/products.repository'

export interface ProductsService {
  list(): ProductDto[]
}

export function createProductsService({ db }: { db: Db }): ProductsService {
  return {
    list: () => listProducts(db)
  }
}
