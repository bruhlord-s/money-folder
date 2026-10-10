import { sql, type SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'

/** `column IN ('a', 'b')` for a CHECK constraint, from the same list the app validates with. */
export function oneOf(column: SQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} IN (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`
}
