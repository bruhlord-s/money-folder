import { z } from 'zod'
import { idSchema } from './accounts'

export const CATEGORY_NAME_MAX = 60
export const PRODUCT_NAME_MAX = 100
export const BRAND_MAX = 60
export const NOTE_MAX = 200
const LINES_MAX = 200
/** One billion rubles, in kopecks. */
const AMOUNT_MAX = 100_000_000_000
/** One million units, in thousandths. */
const MILLI_MAX = 1_000_000_000

/** The only currency for now. Amounts are integer minor units (kopecks). */
export const CURRENCY = 'RUB'

export const TRANSACTION_KINDS = ['expense', 'income', 'transfer'] as const
export type TransactionKind = (typeof TRANSACTION_KINDS)[number]
/** Transfers have no category. */
export const CATEGORY_KINDS = ['expense', 'income'] as const
export type CategoryKind = (typeof CATEGORY_KINDS)[number]

export const PRODUCT_UNITS = ['pcs', 'kg', 'l'] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

/** Quantities and sizes are stored as integer thousandths: 0.75 → 750. */
export const MILLI = 1000
/** Amounts are stored as integer kopecks. */
export const KOPECKS = 100

/** A calendar date, 'YYYY-MM-DD', that exists (no February 30th). */
export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number) as [number, number, number]
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  })

const milliSchema = z.number().int().positive().max(MILLI_MAX)
const amountSchema = z.number().int().positive().max(AMOUNT_MAX)
const noteSchema = z
  .string()
  .trim()
  .max(NOTE_MAX)
  .nullable()
  .transform((note) => note || null)

const productInputSchema = z.object({
  name: z.string().trim().min(1).max(PRODUCT_NAME_MAX),
  brand: z
    .string()
    .trim()
    .max(BRAND_MAX)
    .nullable()
    .transform((brand) => brand || null),
  size: milliSchema.nullable(),
  unit: z.enum(PRODUCT_UNITS)
})
export type ProductInput = z.output<typeof productInputSchema>

const lineInputSchema = z.object({
  /** Null for a line without a product, like a taxi ride. */
  product: productInputSchema.nullable(),
  quantity: milliSchema,
  amount: amountSchema
})

/** Fields of an expense or an income; only the kind differs. */
const categorizedFields = {
  accountId: idSchema,
  categoryName: z.string().trim().min(1).max(CATEGORY_NAME_MAX),
  occurredOn: localDateSchema,
  note: noteSchema,
  lines: z.array(lineInputSchema).min(1).max(LINES_MAX)
}

export const transactionInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('expense'), ...categorizedFields }),
  z.object({ kind: z.literal('income'), ...categorizedFields }),
  z
    .object({
      kind: z.literal('transfer'),
      accountId: idSchema,
      toAccountId: idSchema,
      occurredOn: localDateSchema,
      note: noteSchema,
      amount: amountSchema
    })
    .refine((transfer) => transfer.toAccountId !== transfer.accountId, {
      path: ['toAccountId']
    })
])
export type TransactionInput = z.input<typeof transactionInputSchema>
export type ValidTransactionInput = z.output<typeof transactionInputSchema>

export interface CategoryDto {
  id: number
  kind: CategoryKind
  name: string
}

export interface ProductDto {
  id: number
  name: string
  brand: string | null
  size: number | null
  unit: ProductUnit
}

export interface TransactionLineDto {
  id: number
  product: ProductDto | null
  quantity: number
  amount: number
}

interface AccountRef {
  id: number
  name: string
}

export interface TransactionDto {
  id: number
  kind: TransactionKind
  /** Where the money leaves (expense, transfer) or arrives (income). */
  account: AccountRef
  /** Transfers only. */
  toAccount: AccountRef | null
  /** Null for transfers. */
  category: CategoryDto | null
  /** 'YYYY-MM-DD', a local calendar date. */
  occurredOn: string
  note: string | null
  /** Sum of the line amounts, in kopecks. Always positive; `kind` gives the direction. */
  total: number
  lines: TransactionLineDto[]
}
