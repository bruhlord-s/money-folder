import { createI18n } from 'vue-i18n'
import { en, type MessageSchema } from './en'
import { ru } from './ru'

declare module 'vue-i18n' {
  // Types the keys passed to t() against the English messages.
  export interface DefineLocaleMessage extends MessageSchema {}
}

/** Picks the form for "zero | one | few | many" messages. */
function russianPlural(n: number, choicesLength: number): number {
  if (n === 0) return 0
  const lastTwo = n % 100
  const last = n % 10
  if (lastTwo >= 11 && lastTwo <= 14) return Math.min(3, choicesLength - 1)
  if (last === 1) return 1
  if (last >= 2 && last <= 4) return 2
  return Math.min(3, choicesLength - 1)
}

export const i18n = createI18n({
  legacy: false,
  locale: navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en',
  fallbackLocale: 'en',
  messages: { en, ru },
  pluralRules: { ru: russianPlural }
})
