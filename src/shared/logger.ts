/** Structured context: IDs, counts, durations — never payloads or financial values. */
export type LogMeta = Record<string, unknown>

export interface Logger {
  debug(message: string, meta?: LogMeta): void
  info(message: string, meta?: LogMeta): void
  warn(message: string, meta?: LogMeta): void
  /** Pass the caught Error as `meta.error` to get its stack in the log. */
  error(message: string, meta?: LogMeta): void
  child(scope: string): Logger
}
