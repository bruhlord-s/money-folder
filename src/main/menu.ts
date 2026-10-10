import { Menu, type MenuItemConstructorOptions } from 'electron'
import type { MainMessages } from './i18n'

export function buildAppMenu({
  messages,
  openLogsFolder
}: {
  messages: MainMessages
  openLogsFolder: () => void
}): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' } as const] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [{ label: messages.openLogsFolder, click: openLogsFolder }]
    }
  ]
  return Menu.buildFromTemplate(template)
}
