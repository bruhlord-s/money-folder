import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

export function openDatabase(filePath: string): Db {
  const client = new Database(filePath)
  if (filePath !== ':memory:') client.pragma('journal_mode = WAL')
  client.pragma('foreign_keys = ON')
  return drizzle({ client, schema })
}
