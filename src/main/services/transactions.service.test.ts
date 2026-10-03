import { beforeEach, describe, expect, it } from 'vitest'
import { accountInputSchema } from '@shared/accounts'
import { noopLogger } from '@shared/logger'
import {
  transactionInputSchema,
  type TransactionInput,
  type ValidTransactionInput
} from '@shared/transactions'
import type { Db } from '../db/client'
import { DomainError } from '../errors'
import { createTestDb } from '../testing/test-db'
import { createAccountsService, type AccountsService } from './accounts.service'
import { createCategoriesService } from './categories.service'
import { createProductsService } from './products.service'
import { createTransactionsService, type TransactionsService } from './transactions.service'

const NOW = new Date('2026-10-03T12:00:00Z')
const DAY = '2026-10-02'

type Categorized = Extract<TransactionInput, { kind: 'expense' }>
type Transfer = Extract<TransactionInput, { kind: 'transfer' }>

const milk = { name: 'Milk', brand: 'Prostokvashino', size: 1000, unit: 'l' as const }
const eggs = { name: 'Eggs', brand: 'Selo', size: 10_000, unit: 'pcs' as const }

describe('transactions service', () => {
  let db: Db
  let accounts: AccountsService
  let transactions: TransactionsService
  let accountId: number
  let savingsId: number

  function input(overrides: Partial<Omit<Categorized, 'kind'>> = {}): ValidTransactionInput {
    return transactionInputSchema.parse({
      kind: 'expense',
      accountId,
      categoryName: 'Taxi',
      occurredOn: DAY,
      note: null,
      lines: [{ product: null, quantity: 1000, amount: 50_000 }],
      ...overrides
    })
  }

  function income(overrides: Partial<Omit<Categorized, 'kind'>> = {}): ValidTransactionInput {
    return transactionInputSchema.parse({
      ...input({ categoryName: 'Salary', ...overrides }),
      kind: 'income'
    })
  }

  function transfer(overrides: Partial<Omit<Transfer, 'kind'>> = {}): ValidTransactionInput {
    return transactionInputSchema.parse({
      kind: 'transfer',
      accountId,
      toAccountId: savingsId,
      occurredOn: DAY,
      note: null,
      amount: 1_000_000,
      ...overrides
    })
  }

  function createAccount(name: string): number {
    return accounts.create(
      accountInputSchema.parse({ name, lastFour: null, ownerId: null, tagNames: [] })
    ).id
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
    accountId = createAccount('Card')
    savingsId = createAccount('Savings')
  })

  it('records a single-amount expense like a taxi ride', () => {
    const taxi = transactions.create(input())

    expect(taxi).toMatchObject({
      kind: 'expense',
      account: { id: accountId, name: 'Card' },
      toAccount: null,
      category: { kind: 'expense', name: 'Taxi' },
      occurredOn: DAY,
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
        .list('expense')
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
    const older = transactions.create(input({ occurredOn: '2026-10-01' }))
    const newer = transactions.create(input())

    expect(transactions.list().map((t) => t.id)).toEqual([newer.id, older.id])
  })

  it('lists more transactions than SQLite allows bound parameters', () => {
    const count = 33_000
    const insertTransaction = db.$client.prepare(
      "INSERT INTO transactions (kind, account_id, category_id, occurred_on, created_at, updated_at) VALUES ('expense', ?, ?, ?, 0, 0)"
    )
    const insertLine = db.$client.prepare(
      'INSERT INTO transaction_lines (transaction_id, amount) VALUES (?, 100)'
    )
    const categoryId = transactions.create(input()).category?.id
    db.$client.transaction(() => {
      for (let i = 0; i < count; i++) {
        const { lastInsertRowid } = insertTransaction.run(accountId, categoryId, DAY)
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
    expect(accounts.list({ includeArchived: true })).toHaveLength(2)
  })

  it('records an income with a category of its own kind', () => {
    transactions.create(input({ categoryName: 'Gifts' }))
    const gift = transactions.create(income({ categoryName: 'Gifts' }))

    expect(gift).toMatchObject({ kind: 'income', category: { kind: 'income', name: 'Gifts' } })
    const categories = createCategoriesService({ db })
    const [incomeGifts] = categories.list('income')
    const [expenseGifts] = categories.list('expense')
    expect(incomeGifts?.name).toBe('Gifts')
    expect(expenseGifts?.name).toBe('Gifts')
    expect(incomeGifts?.id).not.toBe(expenseGifts?.id)
  })

  it('records a transfer as one plain line without a category', () => {
    const moved = transactions.create(transfer())

    expect(moved).toMatchObject({
      kind: 'transfer',
      account: { id: accountId, name: 'Card' },
      toAccount: { id: savingsId, name: 'Savings' },
      category: null,
      total: 1_000_000,
      lines: [{ product: null, quantity: 1000, amount: 1_000_000 }]
    })
  })

  it('turns an expense into a transfer on update', () => {
    const taxi = transactions.create(input())
    const updated = transactions.update(taxi.id, transfer())

    expect(updated).toMatchObject({
      kind: 'transfer',
      category: null,
      toAccount: { id: savingsId }
    })
    expect(updated.lines).toHaveLength(1)
  })

  it('rejects a transfer to an unknown account', () => {
    expect(() => transactions.create(transfer({ toAccountId: 999 }))).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })

  it('refuses new money through an archived account', () => {
    accounts.setArchived(savingsId, true)
    const archived = { code: 'ARCHIVED' }

    expect(() => transactions.create(input({ accountId: savingsId }))).toThrow(
      expect.objectContaining(archived)
    )
    expect(() => transactions.create(transfer())).toThrow(expect.objectContaining(archived))
    const taxi = transactions.create(input())
    expect(() => transactions.update(taxi.id, input({ accountId: savingsId }))).toThrow(
      expect.objectContaining(archived)
    )
  })

  it('keeps transactions on an account editable after it is archived', () => {
    const moved = transactions.create(transfer())
    accounts.setArchived(savingsId, true)

    const updated = transactions.update(moved.id, transfer({ amount: 5000, note: 'fixed' }))

    expect(updated).toMatchObject({ total: 5000, note: 'fixed', toAccount: { id: savingsId } })
  })

  it('refuses to delete the target account of a transfer', () => {
    transactions.create(transfer())

    expect(() => accounts.remove(savingsId)).toThrow(expect.objectContaining({ code: 'IN_USE' }))
  })
})
