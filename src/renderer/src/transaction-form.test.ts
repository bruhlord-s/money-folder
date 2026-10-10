import { describe, expect, it } from 'vitest'
import { transactionInputSchema, type TransactionDto } from '@shared/transactions'
import {
  applyProduct,
  emptyLine,
  formErrors,
  formFromTransaction,
  itemize,
  linesTotal,
  removeLine,
  switchToSingleAmount,
  toInput,
  toKopecks,
  type TransactionForm
} from './transaction-form'

const NOW = new Date(2026, 9, 10, 15, 30)
const milk = { id: 1, name: 'Milk', brand: 'Prostokvashino', size: 1000, unit: 'l' as const }
const apples = { id: 2, name: 'Apples', brand: null, size: null, unit: 'kg' as const }

function dto(overrides: Partial<TransactionDto> = {}): TransactionDto {
  return {
    id: 7,
    kind: 'expense',
    account: { id: 1, name: 'Card' },
    toAccount: null,
    category: { id: 3, kind: 'expense', name: 'Taxi' },
    occurredOn: '2026-10-02',
    note: null,
    total: 50_000,
    lines: [{ id: 1, product: null, quantity: 1000, amount: 50_000 }],
    ...overrides
  }
}

const receipt = dto({
  category: { id: 4, kind: 'expense', name: 'Groceries' },
  total: 42_650,
  lines: [
    { id: 1, product: milk, quantity: 3000, amount: 29_700 },
    { id: 2, product: apples, quantity: 750, amount: 12_950 }
  ]
})

/** Parses the form like the dialog does on save. */
function parse(form: TransactionForm): ReturnType<typeof transactionInputSchema.safeParse> {
  return transactionInputSchema.safeParse(toInput(form))
}

describe('formFromTransaction', () => {
  it('starts a new expense on the current calendar day', () => {
    const form = formFromTransaction(null, NOW)

    expect(form).toMatchObject({ kind: 'expense', accountId: null, itemized: false, lines: [] })
    expect(form.occurredAt).toEqual(new Date(2026, 9, 10))
  })

  it('shows a single plain line as a single amount', () => {
    const form = formFromTransaction(dto(), NOW)

    expect(form).toMatchObject({ itemized: false, amount: 500, categoryName: 'Taxi' })
  })

  it.each([
    ['a product', [{ id: 1, product: milk, quantity: 1000, amount: 100 }]],
    ['a quantity other than 1', [{ id: 1, product: null, quantity: 2000, amount: 100 }]],
    [
      'several lines',
      [
        { id: 1, product: null, quantity: 1000, amount: 100 },
        { id: 2, product: null, quantity: 1000, amount: 100 }
      ]
    ]
  ])('shows lines when there is %s', (_, lines) => {
    expect(formFromTransaction(dto({ lines }), NOW).itemized).toBe(true)
  })
})

describe('toInput', () => {
  it.each([
    ['a single amount', dto()],
    ['a receipt', receipt],
    [
      'an income',
      dto({ kind: 'income', category: { id: 5, kind: 'income', name: 'Salary' }, note: 'October' })
    ],
    ['a transfer', dto({ kind: 'transfer', toAccount: { id: 2, name: 'Savings' }, category: null })]
  ])('gives back the stored values of %s', (_, transaction) => {
    const parsed = parse(formFromTransaction(transaction, NOW))

    expect(parsed.success).toBe(true)
    expect(parsed.data).toMatchObject({
      kind: transaction.kind,
      accountId: transaction.account.id,
      occurredOn: transaction.occurredOn,
      note: transaction.note
    })
    if (parsed.data?.kind === 'transfer') {
      expect(parsed.data).toMatchObject({ toAccountId: 2, amount: 50_000 })
    } else {
      expect(parsed.data?.categoryName).toBe(transaction.category?.name)
      expect(parsed.data?.lines).toEqual(
        transaction.lines.map(({ product, quantity, amount }) => ({
          product: product && {
            name: product.name,
            brand: product.brand,
            size: product.size,
            unit: product.unit
          },
          quantity,
          amount
        }))
      )
    }
  })

  it('keeps the calendar day across a daylight saving change', () => {
    const form = formFromTransaction(dto({ occurredOn: '2026-03-29' }), NOW)
    expect(parse(form).data?.occurredOn).toBe('2026-03-29')
  })

  it('treats a line without a name as a line without a product', () => {
    const form = formFromTransaction(receipt, NOW)
    form.lines[0]!.name = '  '

    const data = parse(form).data
    expect(data?.kind !== 'transfer' && data?.lines[0]?.product).toBeNull()
  })
})

describe('toKopecks and linesTotal', () => {
  it('rounds away floating point noise', () => {
    expect(toKopecks(19.99)).toBe(1999)
    expect(toKopecks(0.1 + 0.2)).toBe(30)
    expect(toKopecks(null)).toBe(0)
  })

  it('sums the lines in kopecks', () => {
    expect(linesTotal(formFromTransaction(receipt, NOW).lines)).toBe(42_650)
  })
})

describe('formErrors', () => {
  function errorsOf(form: TransactionForm): ReturnType<typeof formErrors> {
    const parsed = parse(form)
    if (parsed.success) throw new Error('expected the form to be invalid')
    return formErrors(parsed.error.issues, form)
  }

  it('puts a missing single amount on the amount field', () => {
    const form = formFromTransaction(null, NOW)
    form.accountId = 1
    form.categoryName = 'Taxi'

    expect(errorsOf(form)).toEqual({ fields: new Set(['amount']), lineKeys: new Set() })
  })

  it('marks the receipt lines that are wrong', () => {
    const form = formFromTransaction(receipt, NOW)
    form.lines[1]!.quantity = null

    expect(errorsOf(form)).toEqual({
      fields: new Set(['lines']),
      lineKeys: new Set([form.lines[1]!.key])
    })
  })

  it('reports the fields of an empty transfer', () => {
    const form = formFromTransaction(null, NOW)
    form.kind = 'transfer'

    expect(errorsOf(form).fields).toEqual(new Set(['accountId', 'toAccountId', 'amount']))
  })

  it('drops issues on fields without a message', () => {
    const form = formFromTransaction(dto(), NOW)
    form.occurredAt = new Date(Number.NaN)

    expect(errorsOf(form)).toEqual({ fields: new Set(), lineKeys: new Set() })
  })
})

describe('switching between a single amount and lines', () => {
  it('carries the amount into the first line and back', () => {
    const form = formFromTransaction(dto(), NOW)

    itemize(form)
    expect(form).toMatchObject({ itemized: true, lines: [{ amount: 500, quantity: 1 }] })

    switchToSingleAmount(form)
    expect(form).toMatchObject({ itemized: false, amount: 500, lines: [] })
  })

  it('goes back to an empty single amount when the last line is removed', () => {
    const form = formFromTransaction(dto(), NOW)
    itemize(form)

    removeLine(form, form.lines[0]!.key)

    expect(form).toMatchObject({ itemized: false, amount: null, lines: [] })
  })

  it('gives every new line its own key', () => {
    expect(emptyLine().key).not.toBe(emptyLine().key)
  })
})

describe('applyProduct', () => {
  it('fills brand, size and unit from a saved product', () => {
    const line = emptyLine()
    applyProduct(line, milk)
    expect(line).toMatchObject({ name: 'Milk', brand: 'Prostokvashino', size: 1, unit: 'l' })
  })

  it('only sets the name for typed text', () => {
    const line = { ...emptyLine(), brand: 'Selo' }
    applyProduct(line, 'Eggs')
    expect(line).toMatchObject({ name: 'Eggs', brand: 'Selo' })
    applyProduct(line, null)
    expect(line.name).toBe('')
  })
})
