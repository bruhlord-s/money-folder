import type { Logger } from '@shared/logger'
import { openDatabase } from './db/client'
import { runMigrations } from './db/migrate'
import { createAccountsService, type AccountsService } from './services/accounts.service'
import {
  createFamilyMembersService,
  type FamilyMembersService
} from './services/family-members.service'
import { createTagsService, type TagsService } from './services/tags.service'

interface ContainerConfig {
  dbPath: string
  migrationsFolder: string
  logger: Logger
  /** Log SQL statements (development only). */
  logSql: boolean
}

export interface Container {
  services: {
    accounts: AccountsService
    members: FamilyMembersService
    tags: TagsService
  }
  logger: Logger
  dispose: () => void
}

/** Composition root: the only place where dependencies are wired together. */
export function createContainer({
  dbPath,
  migrationsFolder,
  logger,
  logSql
}: ContainerConfig): Container {
  const dbLogger = logger.child('db')
  const db = openDatabase(dbPath, { sqlLogger: logSql ? dbLogger.child('sql') : undefined })
  try {
    const startedAt = performance.now()
    dbLogger.info('migrations start', { folder: migrationsFolder })
    runMigrations(db, migrationsFolder)
    dbLogger.info('migrations done', { durationMs: Math.round(performance.now() - startedAt) })
  } catch (error) {
    db.$client.close()
    throw error
  }

  const now = (): Date => new Date()
  const services = {
    accounts: createAccountsService({ db, logger, now }),
    members: createFamilyMembersService({ db, logger, now }),
    tags: createTagsService({ db })
  }

  return {
    services,
    logger,
    dispose: () => db.$client.close()
  }
}
