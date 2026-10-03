import { dirname } from 'path'
import log from 'electron-log/main'
import type { Logger, LogMeta } from '../../shared/logger'

export type LogLevel = 'info' | 'debug'

const MAX_LOG_FILE_BYTES = 5 * 1024 * 1024

/** Configures electron-log once for the whole app. Call before anything else logs. */
export function initLogging({ level }: { level: LogLevel }): Logger {
  log.initialize()
  log.transports.file.level = level
  log.transports.file.maxSize = MAX_LOG_FILE_BYTES
  log.transports.console.level = level
  log.errorHandler.startCatching()
  return createLogger('app')
}

export function getLogsFolder(): string {
  return dirname(log.transports.file.getFile().path)
}

function createLogger(scope: string): Logger {
  const scoped = log.scope(scope)
  const write =
    (level: 'debug' | 'info' | 'warn' | 'error') =>
    (message: string, meta?: LogMeta): void => {
      if (meta) scoped[level](message, meta)
      else scoped[level](message)
    }

  return {
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
    child: (childScope) => createLogger(`${scope}:${childScope}`)
  }
}
