import { Menu, type MenuItemConstructorOptions } from 'electron'

export function buildAppMenu({ openLogsFolder }: { openLogsFolder: () => void }): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' } as const] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [{ label: 'Open logs folder', click: openLogsFolder }]
    }
  ]
  return Menu.buildFromTemplate(template)
}
