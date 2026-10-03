import type { Logger } from '@shared/logger'
import { openDatabase } from './db/client'
import { runMigrations } from './db/migrate'
import { createAccountsService, type AccountsService } from './services/accounts.service'
import { createCategoriesService, type CategoriesService } from './services/categories.service'
import {
  createFamilyMembersService,
  type FamilyMembersService
} from './services/family-members.service'
import { createProductsService, type ProductsService } from './services/products.service'
import { createTagsService, type TagsService } from './services/tags.service'
import {
  createTransactionsService,
  type TransactionsService
} from './services/transactions.service'

interface ContainerConfig {
  dbPath: string
  migrationsFolder: string
  /** The database is copied here before pending migrations run. */
  backupDir: string
  logger: Logger
  /** Log SQL statements (development only). */
  logSql: boolean
}

export interface Container {
  services: {
    accounts: AccountsService
    members: FamilyMembersService
    tags: TagsService
    categories: CategoriesService
    products: ProductsService
    transactions: TransactionsService
  }
  logger: Logger
  dispose: () => void
}

/** Composition root: the only place where dependencies are wired together. */
export function createContainer({
  dbPath,
  migrationsFolder,
  backupDir,
  logger,
  logSql
}: ContainerConfig): Container {
  const now = (): Date => new Date()
  const dbLogger = logger.child('db')
  const db = openDatabase(dbPath, { sqlLogger: logSql ? dbLogger.child('sql') : undefined })
  try {
    const startedAt = performance.now()
    dbLogger.info('migrations start', { folder: migrationsFolder })
    const { applied, backupPath } = runMigrations(db, migrationsFolder, {
      dir: backupDir,
      now: now(),
      logger: dbLogger
    })
    dbLogger.info('migrations done', {
      applied,
      backupPath,
      durationMs: Math.round(performance.now() - startedAt)
    })
  } catch (error) {
    db.$client.close()
    throw error
  }

  const services = {
    accounts: createAccountsService({ db, logger, now }),
    members: createFamilyMembersService({ db, logger, now }),
    tags: createTagsService({ db }),
    categories: createCategoriesService({ db }),
    products: createProductsService({ db }),
    transactions: createTransactionsService({ db, logger, now })
  }

  return {
    services,
    logger,
    dispose: () => db.$client.close()
  }
}
