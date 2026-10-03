import { beforeEach, describe, expect, it } from 'vitest'
import { accountInputSchema } from '@shared/accounts'
import { noopLogger } from '@shared/logger'
import { transactionInputSchema, type TransactionInput } from '@shared/transactions'
import type { Db } from '../db/client'
import { DomainError } from '../errors'
import { createTestDb } from '../testing/test-db'
import { createAccountsService, type AccountsService } from './accounts.service'
import { createCategoriesService } from './categories.service'
import { createProductsService } from './products.service'
import { createTransactionsService, type TransactionsService } from './transactions.service'

const NOW = new Date('2026-10-03T12:00:00Z')
const DAY = new Date('2026-10-02T00:00:00Z').getTime()

const milk = { name: 'Milk', brand: 'Prostokvashino', size: 1000, unit: 'l' as const }
const eggs = { name: 'Eggs', brand: 'Selo', size: 10_000, unit: 'pcs' as const }

describe('transactions service', () => {
  let db: Db
  let accounts: AccountsService
  let transactions: TransactionsService
  let accountId: number

  function input(
    overrides: Partial<TransactionInput> = {}
  ): ReturnType<typeof transactionInputSchema.parse> {
    return transactionInputSchema.parse({
      accountId,
      categoryName: 'Taxi',
      occurredAt: DAY,
      note: null,
      lines: [{ product: null, quantity: 1000, amount: 50_000 }],
      ...overrides
    })
  }

  const receipt = (): ReturnType<typeof input> =>
    input({
      categoryName: 'Walmart',
      lines: [
        { product: milk, quantity: 3000, amount: 29_700 },
        { product: eggs, quantity: 1000, amount: 12_950 }
      ]
    })

  beforeEach(() => {
    db = createTestDb()
    const deps = { db, logger: noopLogger, now: () => NOW }
    accounts = createAccountsService(deps)
    transactions = createTransactionsService(deps)
    accountId = accounts.create(
      accountInputSchema.parse({ name: 'Card', lastFour: null, ownerId: null, tagNames: [] })
    ).id
  })

  it('records a single-amount expense like a taxi ride', () => {
    const taxi = transactions.create(input())

    expect(taxi).toMatchObject({
      account: { id: accountId, name: 'Card' },
      category: { name: 'Taxi' },
      occurredAt: DAY,
      note: null,
      total: 50_000,
      lines: [{ product: null, quantity: 1000, amount: 50_000 }]
    })
  })

  it('records a receipt with products and sums its lines', () => {
    const groceries = transactions.create(receipt())

    expect(groceries.total).toBe(42_650)
    expect(groceries.lines.map((line) => line.product)).toMatchObject([milk, eggs])
  })

  it('reuses products and categories regardless of case', () => {
    const first = transactions.create(receipt())
    const second = transactions.create(
      input({
        categoryName: 'WALMART',
        lines: [
          {
            product: { ...milk, name: 'milk', brand: 'PROSTOKVASHINO' },
            quantity: 1000,
            amount: 9900
          }
        ]
      })
    )

    expect(second.category).toEqual(first.category)
    expect(second.lines[0]?.product).toEqual(first.lines[0]?.product)
    expect(createProductsService({ db }).list()).toHaveLength(2)
    expect(
      createCategoriesService({ db })
        .list()
        .map((c) => c.name)
    ).toEqual(['Walmart'])
  })

  it('treats another size, brand or unit as another product', () => {
    transactions.create(
      input({
        lines: [
          { product: milk, quantity: 1000, amount: 100 },
          { product: { ...milk, size: 900 }, quantity: 1000, amount: 100 },
          { product: { ...milk, brand: null }, quantity: 1000, amount: 100 },
          { product: { ...milk, size: null }, quantity: 1000, amount: 100 },
          { product: { ...milk, size: null }, quantity: 1000, amount: 100 }
        ]
      })
    )

    expect(createProductsService({ db }).list()).toHaveLength(4)
  })

  it('replaces fields and lines on update', () => {
    const taxi = transactions.create(input())
    const updated = transactions.update(taxi.id, { ...receipt(), note: 'weekly shopping' })

    expect(updated).toMatchObject({
      id: taxi.id,
      category: { name: 'Walmart' },
      note: 'weekly shopping'
    })
    expect(updated.lines).toHaveLength(2)
    expect(transactions.list()).toHaveLength(1)
  })

  it('lists newest first', () => {
    const older = transactions.create(input({ occurredAt: DAY - 86_400_000 }))
    const newer = transactions.create(input())

    expect(transactions.list().map((t) => t.id)).toEqual([newer.id, older.id])
  })

  it('lists more transactions than SQLite allows bound parameters', () => {
    const count = 33_000
    const insertTransaction = db.$client.prepare(
      'INSERT INTO transactions (account_id, category_id, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    const insertLine = db.$client.prepare(
      'INSERT INTO transaction_lines (transaction_id, amount) VALUES (?, 100)'
    )
    const categoryId = transactions.create(input()).category.id
    db.$client.transaction(() => {
      for (let i = 0; i < count; i++) {
        const { lastInsertRowid } = insertTransaction.run(accountId, categoryId, DAY, DAY, DAY)
        insertLine.run(lastInsertRowid)
      }
    })()

    const list = transactions.list()
    expect(list).toHaveLength(count + 1)
    expect(list.every((t) => t.lines.length === 1)).toBe(true)
  })

  it('deletes a transaction with its lines', () => {
    const groceries = transactions.create(receipt())
    transactions.remove(groceries.id)

    expect(transactions.list()).toEqual([])
    expect(db.$client.prepare('SELECT count(*) FROM transaction_lines').pluck().get()).toBe(0)
  })

  it('rejects an unknown account or transaction', () => {
    expect(() => transactions.create(input({ accountId: 999 }))).toThrow(DomainError)
    expect(() => transactions.update(999, input())).toThrow(DomainError)
    expect(() => transactions.remove(999)).toThrow(DomainError)
  })

  it('refuses to delete an account that has transactions', () => {
    transactions.create(input())

    expect(() => accounts.remove(accountId)).toThrow(expect.objectContaining({ code: 'IN_USE' }))
    expect(accounts.list({ includeArchived: true })).toHaveLength(1)
  })
})
