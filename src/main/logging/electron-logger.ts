import { dirname } from 'path'
import log from 'electron-log/main'
import type { Logger, LogMeta } from '@shared/logger'
import { formatError } from './format-error'

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
      if (meta) scoped[level](message, withCauses(meta))
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

/** Errors in `meta` become text with their cause chain, which electron-log would drop. */
function withCauses(meta: LogMeta): LogMeta {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [
      key,
      value instanceof Error ? formatError(value) : value
    ])
  )
}
