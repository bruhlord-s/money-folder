import type { ErrorCode } from '@shared/errors'

/** An expected failure. IPC handlers turn it into `{ ok: false, code }` for the renderer. */
export class DomainError extends Error {
  constructor(
    readonly code: Exclude<ErrorCode, 'INTERNAL'>,
    message: string
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
