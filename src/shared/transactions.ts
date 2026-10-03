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

export const PRODUCT_UNITS = ['pcs', 'kg', 'l'] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

/** Quantities and sizes are stored as integer thousandths: 0.75 → 750. */
export const MILLI = 1000
/** Amounts are stored as integer kopecks. */
export const KOPECKS = 100

const milliSchema = z.number().int().positive().max(MILLI_MAX)

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
  amount: z.number().int().positive().max(AMOUNT_MAX)
})

export const transactionInputSchema = z.object({
  accountId: idSchema,
  categoryName: z.string().trim().min(1).max(CATEGORY_NAME_MAX),
  /** Milliseconds since epoch. */
  occurredAt: z.number().int().nonnegative(),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX)
    .nullable()
    .transform((note) => note || null),
  lines: z.array(lineInputSchema).min(1).max(LINES_MAX)
})
export type TransactionInput = z.input<typeof transactionInputSchema>
export type ValidTransactionInput = z.output<typeof transactionInputSchema>

export interface CategoryDto {
  id: number
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

export interface TransactionDto {
  id: number
  account: { id: number; name: string }
  category: CategoryDto
  occurredAt: number
  note: string | null
  /** Sum of the line amounts, in kopecks. */
  total: number
  lines: TransactionLineDto[]
}
