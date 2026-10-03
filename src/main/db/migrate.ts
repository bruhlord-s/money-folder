import { mkdirSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Logger } from '@shared/logger'
import type { Db } from './client'

const MIGRATIONS_TABLE = '__drizzle_migrations'
const BACKUP_PREFIX = 'before-migration-'
/** Older backups are deleted; one per app update is plenty. */
const BACKUPS_KEPT = 5

interface BackupOptions {
  /** Where to put a copy of the database before changing its schema. */
  dir: string
  now: Date
  logger: Logger
}

export interface MigrationResult {
  applied: number
  /** Null when nothing was pending or the database was new. */
  backupPath: string | null
}

/**
 * Applies pending migrations. If there are any and the database already holds data, it is
 * first copied to `backup.dir`, so a failed or faulty migration never costs the user their data.
 */
export function runMigrations(
  db: Db,
  migrationsFolder: string,
  backup?: BackupOptions
): MigrationResult {
  const lastApplied = lastAppliedMigration(db)
  // Drizzle's own rule: a migration is pending if it is newer than the last applied one.
  const applied = readMigrationFiles({ migrationsFolder }).filter(
    (migration) => lastApplied === undefined || migration.folderMillis > lastApplied
  ).length
  const backupPath =
    applied > 0 && lastApplied !== undefined && backup ? backupDatabase(db, backup) : null
  migrate(db, { migrationsFolder })
  return { applied, backupPath }
}

/** `created_at` of the newest applied migration, or undefined for a new database. */
function lastAppliedMigration(db: Db): number | undefined {
  const table = db.$client
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(MIGRATIONS_TABLE)
  if (!table) return undefined
  const last = db.$client
    .prepare(`SELECT max(created_at) FROM ${MIGRATIONS_TABLE}`)
    .pluck()
    .get() as number | null
  return last === null ? undefined : Number(last)
}

/** A consistent copy (VACUUM INTO works with WAL and open connections), then old copies pruned. */
function backupDatabase(db: Db, { dir, now, logger }: BackupOptions): string {
  mkdirSync(dir, { recursive: true })
  // 2026-10-03T21-42-43-120Z: sortable and valid in Windows file names.
  const path = join(dir, `${BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, '-')}.db`)
  db.$client.prepare('VACUUM INTO ?').run(path)

  const backups = readdirSync(dir)
    .filter((name) => name.startsWith(BACKUP_PREFIX))
    .sort()
  for (const name of backups.slice(0, -BACKUPS_KEPT)) {
    // Best effort: a copy locked by antivirus or sync must not stop the app from starting.
    try {
      rmSync(join(dir, name))
    } catch (error) {
      logger.warn('old backup not deleted', { name, error })
    }
  }
  return path
}
