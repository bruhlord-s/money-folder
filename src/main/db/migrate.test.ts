import { describe, expect, it } from 'vitest'
import { createTestDb } from '../testing/test-db'

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
