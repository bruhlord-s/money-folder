import { describe, expect, it } from 'vitest'
import { mainMessages } from './i18n'

describe('mainMessages', () => {
  it('uses Russian for any Russian locale and English otherwise', () => {
    expect(mainMessages('ru').databaseError).toBe('Не удалось открыть базу данных')
    expect(mainMessages('ru-RU').openLogsFolder).toBe('Открыть папку с журналами')
    expect(mainMessages('en-US').databaseError).toBe('Failed to open the database')
    expect(mainMessages('de').openLogsFolder).toBe('Open logs folder')
  })
})
