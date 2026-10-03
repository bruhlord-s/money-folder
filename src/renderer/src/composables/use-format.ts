import { useI18n } from 'vue-i18n'
import { CURRENCY, KOPECKS, MILLI, type ProductDto } from '@shared/transactions'
import { fromLocalDate } from '../local-date'

interface UseFormat {
  /** Kopecks → "1 234,50 ₽" in the current locale. */
  money: (kopecks: number) => string
  /** Thousandths → "0.75". */
  milli: (value: number) => string
  /** 'YYYY-MM-DD' → a calendar date in the current locale. */
  date: (localDate: string) => string
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
        currency: CURRENCY,
        currencyDisplay: 'narrowSymbol'
      }).format(kopecks / KOPECKS),
    milli,
    date: (localDate) =>
      new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
        fromLocalDate(localDate)
      ),
    product: ({ name, brand, size, unit }) =>
      [name, brand, size === null ? null : `${milli(size)} ${t(`units.${unit}`)}`]
        .filter(Boolean)
        .join(' · ')
  }
}
