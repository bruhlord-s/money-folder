import type { Logger } from '../shared/logger'
import { openDatabase, type Db } from './db/client'
import { runMigrations } from './db/migrate'

interface ContainerConfig {
  dbPath: string
  migrationsFolder: string
  logger: Logger
  /** Log SQL statements (development only). */
  logSql: boolean
}

export interface Container {
  db: Db
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

  return {
    db,
    logger,
    dispose: () => db.$client.close()
  }
}
