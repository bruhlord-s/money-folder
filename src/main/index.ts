import { app, shell, BrowserWindow, dialog, Menu } from 'electron'
import { join } from 'path'
import { release } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createContainer, type Container } from './container'
import { getLogsFolder, initLogging } from './logging/electron-logger'
import { buildAppMenu } from './menu'

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

function initContainer(): Container {
  const dbPath = join(app.getPath('userData'), 'money-folder.db')
  const created = createContainer({
    dbPath,
    // Packaged builds ship migrations as extraResources (see electron-builder.yml).
    migrationsFolder: app.isPackaged
      ? join(process.resourcesPath, 'migrations')
      : join(app.getAppPath(), 'src/main/db/migrations'),
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
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
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

  Menu.setApplicationMenu(
    buildAppMenu({
      openLogsFolder: () => {
        void shell.openPath(getLogsFolder())
      }
    })
  )

  try {
    container = initContainer()
  } catch (error) {
    logger.error('failed to open database', { error })
    dialog.showErrorBox(
      'Failed to open the database',
      error instanceof Error ? error.message : String(error)
    )
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
