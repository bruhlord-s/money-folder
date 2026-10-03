import { describe, expect, it } from 'vitest'
import { errorMessages, formatError } from './format-error'

const sqliteError = new Error('table `categories` already exists')
const drizzleError = new Error('Failed to run the query', { cause: sqliteError })

describe('formatError', () => {
  it('appends the cause chain to the stack', () => {
    const text = formatError(drizzleError)
    expect(text).toMatch(/^Error: Failed to run the query\n\s+at /)
    expect(text).toContain('Caused by: Error: table `categories` already exists')
  })

  it('is just the stack without a cause', () => {
    expect(formatError(sqliteError)).toBe(sqliteError.stack)
  })
})

describe('errorMessages', () => {
  it('lists every message in the chain', () => {
    expect(errorMessages(drizzleError)).toBe(
      'Failed to run the query\ntable `categories` already exists'
    )
  })

  it('handles values that are not errors', () => {
    expect(errorMessages('disk full')).toBe('disk full')
    expect(errorMessages(new Error('outer', { cause: 42 }))).toBe('outer\n42')
  })
})
