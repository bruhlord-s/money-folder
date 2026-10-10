import type { z } from 'zod'
import {
  KOPECKS,
  MILLI,
  type ProductDto,
  type ProductUnit,
  type TransactionDto,
  type TransactionKind
} from '@shared/transactions'
import { fromLocalDate, toLocalDate } from './local-date'

/**
 * The transaction dialog's state and its conversions, kept free of Vue so they can be tested.
 * Amounts are edited in rubles, quantities and sizes in whole units; they become kopecks and
 * thousandths only in toInput().
 */
export interface LineForm {
  /** Stable key for v-for and for highlighting invalid lines. */
  key: number
  name: string
  brand: string
  size: number | null
  unit: ProductUnit
  quantity: number | null
  amount: number | null
}

export interface TransactionForm {
  kind: TransactionKind
  occurredAt: Date
  accountId: number | null
  /** Transfers only. */
  toAccountId: number | null
  categoryName: string
  note: string
  /** false: one amount (taxi). true: a table of receipt lines, for expenses only. */
  itemized: boolean
  amount: number | null
  lines: LineForm[]
}

/** Fields that show their own error message. */
const FORM_FIELDS = ['accountId', 'toAccountId', 'categoryName', 'amount', 'note', 'lines'] as const
export type FormField = (typeof FORM_FIELDS)[number]

export interface FormErrors {
  fields: Set<FormField>
  /** Keys of the receipt lines that failed validation. */
  lineKeys: Set<number>
}

let nextKey = 0

function toKopecks(rubles: number | null): number {
  return rubles === null ? 0 : Math.round(rubles * KOPECKS)
}

function toMilli(units: number | null): number {
  return units === null ? 0 : Math.round(units * MILLI)
}

export function emptyLine(): LineForm {
  return { key: nextKey++, name: '', brand: '', size: null, unit: 'pcs', quantity: 1, amount: null }
}

/** The form for editing `transaction`, or a new expense dated `now`'s calendar day. */
export function formFromTransaction(
  transaction: TransactionDto | null,
  now: Date
): TransactionForm {
  const lines = transaction?.lines ?? []
  // The single-amount form can only show one line without a product and with quantity 1.
  const itemized =
    lines.length > 1 || lines.some((line) => line.product !== null || line.quantity !== MILLI)
  return {
    kind: transaction?.kind ?? 'expense',
    occurredAt: transaction
      ? fromLocalDate(transaction.occurredOn)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    accountId: transaction?.account.id ?? null,
    toAccountId: transaction?.toAccount?.id ?? null,
    categoryName: transaction?.category?.name ?? '',
    note: transaction?.note ?? '',
    itemized,
    amount: itemized || !lines[0] ? null : lines[0].amount / KOPECKS,
    lines: itemized
      ? lines.map((line) => ({
          key: nextKey++,
          name: line.product?.name ?? '',
          brand: line.product?.brand ?? '',
          size: line.product?.size == null ? null : line.product.size / MILLI,
          unit: line.product?.unit ?? 'pcs',
          quantity: line.quantity / MILLI,
          amount: line.amount / KOPECKS
        }))
      : []
  }
}

/** The raw input for transactionInputSchema; validation happens there. */
export function toInput(form: TransactionForm): unknown {
  const common = {
    kind: form.kind,
    accountId: form.accountId,
    occurredOn: toLocalDate(form.occurredAt),
    note: form.note
  }
  if (form.kind === 'transfer') {
    return { ...common, toAccountId: form.toAccountId, amount: toKopecks(form.amount) }
  }
  return { ...common, categoryName: form.categoryName, lines: toLines(form) }
}

function toLines(form: TransactionForm): unknown[] {
  if (!form.itemized) {
    return [{ product: null, quantity: MILLI, amount: toKopecks(form.amount) }]
  }
  return form.lines.map((line) => ({
    // A line without a name has no product, like a bag fee.
    product: line.name.trim()
      ? {
          name: line.name,
          brand: line.brand,
          size: line.size === null ? null : toMilli(line.size),
          unit: line.unit
        }
      : null,
    quantity: toMilli(line.quantity),
    amount: toKopecks(line.amount)
  }))
}

/** Sum of the receipt lines, in kopecks. */
export function linesTotal(lines: LineForm[]): number {
  return lines.reduce((sum, line) => sum + toKopecks(line.amount), 0)
}

/**
 * Where to show each validation issue. A single amount is stored as a line, so its line errors
 * belong to the amount field. Issues on fields without a message of their own are dropped.
 */
export function formErrors(issues: readonly z.core.$ZodIssue[], form: TransactionForm): FormErrors {
  const errors: FormErrors = { fields: new Set(), lineKeys: new Set() }
  for (const { path } of issues) {
    const [field, index] = path
    if (field === 'lines') {
      if (!form.itemized) {
        errors.fields.add('amount')
        continue
      }
      errors.fields.add('lines')
      const line = typeof index === 'number' ? form.lines[index] : undefined
      if (line) errors.lineKeys.add(line.key)
    } else if (FORM_FIELDS.some((known) => known === field)) {
      errors.fields.add(field as FormField)
    }
  }
  return errors
}

/** Switches to receipt lines; the single amount becomes the first line. */
export function itemize(form: TransactionForm): void {
  form.itemized = true
  form.lines = [{ ...emptyLine(), amount: form.amount }]
}

/** Switches back to a single amount, keeping the first line's amount. */
export function switchToSingleAmount(form: TransactionForm): void {
  form.itemized = false
  form.amount = form.lines[0]?.amount ?? null
  form.lines = []
}

export function removeLine(form: TransactionForm, key: number): void {
  form.lines = form.lines.filter((line) => line.key !== key)
  if (form.lines.length === 0) switchToSingleAmount(form)
}

/** Typing sets the name; picking a saved product fills brand, size and unit too. */
export function applyProduct(line: LineForm, value: string | ProductDto | null): void {
  if (value === null || typeof value === 'string') {
    line.name = value ?? ''
    return
  }
  line.name = value.name
  line.brand = value.brand ?? ''
  line.size = value.size === null ? null : value.size / MILLI
  line.unit = value.unit
}
