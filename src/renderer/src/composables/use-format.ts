import { useI18n } from 'vue-i18n'
import { KOPECKS, MILLI, type ProductDto } from '@shared/transactions'

interface UseFormat {
  /** Kopecks → "1 234,50 ₽" in the current locale. */
  money: (kopecks: number) => string
  /** Thousandths → "0.75". */
  milli: (value: number) => string
  /** A calendar date without the time. */
  date: (ms: number) => string
  /** "Milk · Prostokvashino · 1 l" */
  product: (product: Omit<ProductDto, 'id'>) => string
}

export function useFormat(): UseFormat {
  const { t, locale } = useI18n()

  const milli = (value: number): string =>
    new Intl.NumberFormat(locale.value, { maximumFractionDigits: 3 }).format(value / MILLI)

  return {
    money: (kopecks) =>
      new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: 'RUB',
        currencyDisplay: 'narrowSymbol'
      }).format(kopecks / KOPECKS),
    milli,
    date: (ms) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(ms),
    product: ({ name, brand, size, unit }) =>
      [name, brand, size === null ? null : `${milli(size)} ${t(`units.${unit}`)}`]
        .filter(Boolean)
        .join(' · ')
  }
}
