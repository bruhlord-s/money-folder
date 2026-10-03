import { app, shell, BrowserWindow, dialog, Menu, session } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { release } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createContainer, type Container } from './container'
import { getLogsFolder, initLogging } from './logging/electron-logger'
import { errorMessages } from './logging/format-error'
import { registerIpcHandlers } from './ipc'
import { buildAppMenu } from './menu'
import { denyPermissions, hardenWindow } from './security'

// `--verbose` enables debug logs in production builds.
const logLevel = is.dev || app.commandLine.hasSwitch('verbose') ? 'debug' : 'info'
const logger = initLogging({ level: logLevel })
logger.info('app starting', {
  version: app.getVersion(),
  electron: process.versions.electron,
  platform: process.platform,
  osRelease: release(),
  packaged: app.isPackaged,
  logLevel
})

let container: Container | undefined

// The renderer's own page: the dev server with HMR in development, the bundled file in production.
// Navigation and IPC are trusted only from here.
const appUrl =
  is.dev && process.env['ELECTRON_RENDERER_URL']
    ? process.env['ELECTRON_RENDERER_URL']
    : pathToFileURL(join(__dirname, '../renderer/index.html')).href

function initContainer(): Container {
  const userData = app.getPath('userData')
  const dbPath = join(userData, 'money-folder.db')
  const created = createContainer({
    dbPath,
    // Packaged builds ship migrations as extraResources (see electron-builder.yml).
    migrationsFolder: app.isPackaged
      ? join(process.resourcesPath, 'migrations')
      : join(app.getAppPath(), 'src/main/db/migrations'),
    backupDir: join(userData, 'backups'),
    logger,
    logSql: is.dev
  })
  logger.info('database ready', { dbPath })
  return created
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // The preload is bundled and needs nothing but contextBridge and ipcRenderer.
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    // maximize() also shows the window, but without focus; show() focuses it.
    mainWindow.maximize()
    mainWindow.show()
  })

  hardenWindow(mainWindow, {
    appUrl,
    openExternal: (url) => void shell.openExternal(url),
    logger: logger.child('security')
  })

  void mainWindow.loadURL(appUrl)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
void app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.money-folder.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  denyPermissions(session.defaultSession, logger.child('security'))

  Menu.setApplicationMenu(
    buildAppMenu({
      openLogsFolder: () => {
        void shell.openPath(getLogsFolder())
      }
    })
  )

  try {
    container = initContainer()
    registerIpcHandlers(container, appUrl)
  } catch (error) {
    logger.error('failed to open database', { error })
    dialog.showErrorBox('Failed to open the database', errorMessages(error))
    app.quit()
    return
  }

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  container?.dispose()
  container = undefined
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
