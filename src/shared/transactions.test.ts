import { describe, expect, it } from 'vitest'
import { localDateSchema, transactionInputSchema, type ValidTransactionInput } from './transactions'

const line = { product: null, quantity: 1000, amount: 50_000 }
const valid = {
  kind: 'expense',
  accountId: 1,
  categoryName: 'Taxi',
  occurredOn: '2026-10-02',
  note: null,
  lines: [line]
}
const transfer = {
  kind: 'transfer',
  accountId: 1,
  toAccountId: 2,
  occurredOn: '2026-10-02',
  note: null,
  amount: 100_000
}
const milk = { name: 'Milk', brand: 'Prostokvashino', size: 1000, unit: 'l' }

/** Parses an expense or an income; fails the test on a transfer. */
function parseCategorized(input: object): Exclude<ValidTransactionInput, { kind: 'transfer' }> {
  const parsed = transactionInputSchema.parse(input)
  if (parsed.kind === 'transfer') throw new Error('expected an expense or an income')
  return parsed
}

describe('transactionInputSchema', () => {
  it('trims the category and rejects a blank one', () => {
    expect(parseCategorized({ ...valid, categoryName: ' Taxi ' }).categoryName).toBe('Taxi')
    expect(transactionInputSchema.safeParse({ ...valid, categoryName: ' ' }).success).toBe(false)
  })

  it('requires at least one line', () => {
    expect(transactionInputSchema.safeParse({ ...valid, lines: [] }).success).toBe(false)
  })

  it.each([0, -100, 1.5])('rejects amount %s', (amount) => {
    expect(
      transactionInputSchema.safeParse({ ...valid, lines: [{ ...line, amount }] }).success
    ).toBe(false)
    expect(transactionInputSchema.safeParse({ ...transfer, amount }).success).toBe(false)
  })

  it('turns a blank note and brand into null', () => {
    const parsed = parseCategorized({
      ...valid,
      note: '  ',
      lines: [{ ...line, product: { ...milk, brand: ' ' } }]
    })
    expect(parsed.note).toBeNull()
    expect(parsed.lines[0]?.product?.brand).toBeNull()
  })

  it('rejects an unknown unit and a zero size', () => {
    const withProduct = (product: object): boolean =>
      transactionInputSchema.safeParse({ ...valid, lines: [{ ...line, product }] }).success
    expect(withProduct(milk)).toBe(true)
    expect(withProduct({ ...milk, unit: 'ml' })).toBe(false)
    expect(withProduct({ ...milk, size: 0 })).toBe(false)
  })

  it('accepts an income like an expense and rejects an unknown kind', () => {
    expect(transactionInputSchema.safeParse({ ...valid, kind: 'income' }).success).toBe(true)
    expect(transactionInputSchema.safeParse({ ...valid, kind: 'refund' }).success).toBe(false)
  })

  it('rejects a transfer to the same account', () => {
    expect(transactionInputSchema.safeParse(transfer).success).toBe(true)
    expect(transactionInputSchema.safeParse({ ...transfer, toAccountId: 1 }).success).toBe(false)
  })
})

describe('localDateSchema', () => {
  it.each(['2026-10-02', '2024-02-29'])('accepts %s', (date) => {
    expect(localDateSchema.safeParse(date).success).toBe(true)
  })

  it.each(['2026-02-30', '2026-13-01', '2026-1-2', '02.10.2026', ''])('rejects %s', (date) => {
    expect(localDateSchema.safeParse(date).success).toBe(false)
  })
})
