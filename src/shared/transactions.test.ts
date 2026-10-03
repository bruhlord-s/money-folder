import { describe, expect, it } from 'vitest'
import { transactionInputSchema } from './transactions'

const line = { product: null, quantity: 1000, amount: 50_000 }
const valid = { accountId: 1, categoryName: 'Taxi', occurredAt: 0, note: null, lines: [line] }
const milk = { name: 'Milk', brand: 'Prostokvashino', size: 1000, unit: 'l' }

describe('transactionInputSchema', () => {
  it('trims the category and rejects a blank one', () => {
    expect(transactionInputSchema.parse({ ...valid, categoryName: ' Taxi ' }).categoryName).toBe(
      'Taxi'
    )
    expect(transactionInputSchema.safeParse({ ...valid, categoryName: ' ' }).success).toBe(false)
  })

  it('requires at least one line', () => {
    expect(transactionInputSchema.safeParse({ ...valid, lines: [] }).success).toBe(false)
  })

  it.each([0, -100, 1.5])('rejects amount %s', (amount) => {
    expect(
      transactionInputSchema.safeParse({ ...valid, lines: [{ ...line, amount }] }).success
    ).toBe(false)
  })

  it('turns a blank note and brand into null', () => {
    const parsed = transactionInputSchema.parse({
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
})
