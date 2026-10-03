/**
 * Drizzle's query errors carry the bound params in `message` and `params`, and those may hold
 * financial data. Keep only the SQL and the underlying driver error.
 */
export function redactError(error: unknown): unknown {
  if (error instanceof Error && 'query' in error && 'params' in error) {
    return { name: error.name, query: error.query, cause: error.cause }
  }
  return error
}
