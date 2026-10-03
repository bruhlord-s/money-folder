import type { BrowserWindow, IpcMainInvokeEvent, Session } from 'electron'
import type { Logger } from '@shared/logger'

/**
 * Whether `url` is the app's own page: the same origin as the dev server in development, or the
 * same index.html file in production. Anything else is foreign content and gets no trust.
 */
export function isAppUrl(url: string, appUrl: string): boolean {
  const target = parse(url)
  const app = parse(appUrl)
  if (!target || !app) return false
  if (app.protocol === 'file:') {
    return target.protocol === 'file:' && target.pathname === app.pathname
  }
  return target.origin === app.origin
}

/** Only web links leave the app, in the system browser. No file:, javascript: or custom schemes. */
export function isSafeExternalUrl(url: string): boolean {
  return parse(url)?.protocol === 'https:'
}

/** The window can't navigate away from the app or open new windows; https links open in the browser. */
export function hardenWindow(
  window: BrowserWindow,
  {
    appUrl,
    openExternal,
    logger
  }: { appUrl: string; openExternal: (url: string) => void; logger: Logger }
): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) openExternal(url)
    else logger.warn('blocked window open', { protocol: parse(url)?.protocol })
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url, appUrl)) return
    event.preventDefault()
    logger.warn('blocked navigation', { protocol: parse(url)?.protocol })
  })
}

/** Wraps an IPC handler so that it runs only for the app's own page. */
export function trustedSenderOnly<T>(
  channel: string,
  handler: (rawInput: unknown) => T,
  { appUrl, logger }: { appUrl: string; logger: Logger }
): (event: Pick<IpcMainInvokeEvent, 'senderFrame'>, rawInput: unknown) => T {
  return (event, rawInput) => {
    // senderFrame is null once the frame has navigated away or been destroyed.
    if (!isAppUrl(event.senderFrame?.url ?? '', appUrl)) {
      logger.warn(channel, { code: 'UNTRUSTED_SENDER' })
      throw new Error('untrusted sender')
    }
    return handler(rawInput)
  }
}

/** The app needs no camera, microphone, notifications or the like: deny every permission request. */
export function denyPermissions(session: Session, logger: Logger): void {
  session.setPermissionRequestHandler((_webContents, permission, callback) => {
    logger.warn('denied permission', { permission })
    callback(false)
  })
}

function parse(url: string): URL | undefined {
  try {
    return new URL(url)
  } catch {
    return undefined
  }
}
