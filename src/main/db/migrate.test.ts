import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { noopLogger } from '@shared/logger'
import { createTestDb } from '../testing/test-db'
import { openDatabase, type Db } from './client'
import { runMigrations } from './migrate'

const REAL_MIGRATIONS = join(__dirname, 'migrations')

describe('migrations', () => {
  it('apply cleanly to an empty database', () => {
    const db = createTestDb()
    const tables = db.$client
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .pluck()
      .all()
    expect(tables).toContain('__drizzle_migrations')
  })

  it('enable foreign keys', () => {
    const db = createTestDb()
    expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1)
  })
})

describe('backup before migrations', () => {
  let dir: string
  let migrationsFolder: string
  let backupDir: string
  let dbPath: string
  const open: Db[] = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'money-folder-migrate-'))
    migrationsFolder = join(dir, 'migrations')
    backupDir = join(dir, 'backups')
    dbPath = join(dir, 'app.db')
    cpSync(REAL_MIGRATIONS, migrationsFolder, { recursive: true })
  })

  afterEach(() => {
    for (const db of open.splice(0)) db.$client.close()
    rmSync(dir, { recursive: true, force: true })
  })

  function migrateFile(now = new Date('2026-10-03T12:00:00Z')): ReturnType<typeof runMigrations> {
    const db = openDatabase(dbPath)
    open.push(db)
    return runMigrations(db, migrationsFolder, { dir: backupDir, now, logger: noopLogger })
  }

  /** Simulates an app update that ships one more migration. */
  function addMigration(tag: string, sql: string): void {
    const journalPath = join(migrationsFolder, 'meta/_journal.json')
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8')) as {
      entries: { idx: number; when: number; tag: string }[]
    }
    const last = journal.entries.at(-1)
    if (!last) throw new Error('empty journal')
    journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1, tag })
    writeFileSync(journalPath, JSON.stringify(journal))
    writeFileSync(join(migrationsFolder, `${tag}.sql`), sql)
  }

  it('does not back up a new database', () => {
    expect(migrateFile()).toMatchObject({ backupPath: null })
    expect(readdirSync(dir)).not.toContain('backups')
  })

  it('does not back up when nothing is pending', () => {
    migrateFile()
    expect(migrateFile()).toEqual({ applied: 0, backupPath: null })
  })

  it('copies the database as it was before pending migrations run', () => {
    migrateFile()
    open[0]?.$client.prepare("INSERT INTO tags (name, name_key) VALUES ('Food', 'food')").run()
    addMigration('0099_extra', 'CREATE TABLE `extra` (`id` integer);')

    const { applied, backupPath } = migrateFile()

    expect(applied).toBe(1)
    expect(backupPath).not.toBeNull()
    const backup = new Database(backupPath ?? '', { readonly: true })
    const tables = backup.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck()
    expect(tables.all()).not.toContain('extra')
    expect(backup.prepare('SELECT name FROM tags').pluck().all()).toEqual(['Food'])
    backup.close()
  })

  it('keeps only the five newest backups', () => {
    migrateFile()
    for (let i = 0; i < 7; i++) {
      addMigration(`009${i}_extra`, `CREATE TABLE \`extra_${i}\` (\`id\` integer);`)
      migrateFile(new Date(Date.UTC(2026, 9, 3, 12, i)))
    }

    const backups = readdirSync(backupDir).sort()
    expect(backups).toHaveLength(5)
    expect(backups[0]).toContain('2026-10-03T12-02')
  })

  it('still migrates when an old backup cannot be deleted', () => {
    migrateFile()
    // A directory makes the delete fail, like a file locked by antivirus or sync on Windows.
    mkdirSync(join(backupDir, 'before-migration-2000-01-01T00-00-00-000Z.db'), { recursive: true })
    for (let i = 0; i < 5; i++) {
      addMigration(`009${i}_extra`, `CREATE TABLE \`extra_${i}\` (\`id\` integer);`)
      expect(migrateFile(new Date(Date.UTC(2026, 9, 3, 12, i))).applied).toBe(1)
    }

    expect(readdirSync(backupDir)).toHaveLength(6)
  })
})
