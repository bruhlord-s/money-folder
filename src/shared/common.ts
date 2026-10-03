import { z } from 'zod'

/** A database row id. */
export const idSchema = z.number().int().positive()

/**
 * The form of a name used to compare names: "Мама" and " мама " are the same. JavaScript's
 * toLowerCase folds every alphabet, unlike SQLite's lower(), which only folds ASCII. The database
 * stores this in `name_key` columns, and the renderer uses it to match what the database will.
 */
export function nameKey(name: string): string {
  return name.trim().toLowerCase()
}
