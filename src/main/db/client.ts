import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { Logger } from '../../shared/logger'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

interface OpenDatabaseOptions {
  /** Logs every SQL statement at debug. Params are never logged: they may hold financial data. */
  sqlLogger?: Logger
}

export function openDatabase(filePath: string, { sqlLogger }: OpenDatabaseOptions = {}): Db {
  const client = new Database(filePath)
  if (filePath !== ':memory:') client.pragma('journal_mode = WAL')
  client.pragma('foreign_keys = ON')
  return drizzle({
    client,
    schema,
    logger: sqlLogger ? { logQuery: (query) => sqlLogger.debug(query) } : false
  })
}
