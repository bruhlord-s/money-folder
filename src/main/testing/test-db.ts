import { join } from 'path'
import { openDatabase, type Db } from '../db/client'
import { runMigrations } from '../db/migrate'

const MIGRATIONS_FOLDER = join(__dirname, '../db/migrations')

/** A fresh in-memory database with the real migrations applied. */
export function createTestDb(): Db {
  const db = openDatabase(':memory:')
  runMigrations(db, MIGRATIONS_FOLDER)
  return db
}
