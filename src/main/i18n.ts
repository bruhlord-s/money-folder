/** The few strings the main process shows itself; the renderer has its own vue-i18n messages. */
const en = {
  openLogsFolder: 'Open logs folder',
  databaseError: 'Failed to open the database'
}

const ru: typeof en = {
  openLogsFolder: 'Открыть папку с журналами',
  databaseError: 'Не удалось открыть базу данных'
}

export type MainMessages = typeof en

/** Same rule as the renderer: Russian for any Russian locale, English otherwise. */
export function mainMessages(locale: string): MainMessages {
  return locale.toLowerCase().startsWith('ru') ? ru : en
}
