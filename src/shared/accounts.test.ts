import { describe, expect, it } from 'vitest'
import { accountInputSchema } from './accounts'

const valid = { name: 'Card', lastFour: null, ownerId: null, tagNames: [] }

describe('accountInputSchema', () => {
  it('trims the name and rejects blank names', () => {
    expect(accountInputSchema.parse({ ...valid, name: '  Card  ' }).name).toBe('Card')
    expect(accountInputSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
  })

  it.each(['123', '12345', '12a4', ' 1234'])('rejects last four "%s"', (lastFour) => {
    expect(accountInputSchema.safeParse({ ...valid, lastFour }).success).toBe(false)
  })

  it('accepts exactly four digits or null', () => {
    expect(accountInputSchema.safeParse({ ...valid, lastFour: '0042' }).success).toBe(true)
    expect(accountInputSchema.safeParse(valid).success).toBe(true)
  })

  it('trims tags and drops case-insensitive duplicates, keeping the first spelling', () => {
    const parsed = accountInputSchema.parse({ ...valid, tagNames: [' Family ', 'family', 'Trip'] })
    expect(parsed.tagNames).toEqual(['Family', 'Trip'])
  })

  it('rejects blank tags', () => {
    expect(accountInputSchema.safeParse({ ...valid, tagNames: [' '] }).success).toBe(false)
  })
})
