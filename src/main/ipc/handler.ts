import type { z } from 'zod'
import type { IpcChannel, IpcInput, IpcOutput, Result } from '@shared/ipc'
import type { Logger } from '@shared/logger'
import { DomainError } from '../errors'
import { redactError } from '../logging/redact-error'

type Handler = (rawInput: unknown) => Result<unknown>
export type HandlerEntry = [IpcChannel, Handler]

/**
 * Validates the renderer's input, runs the service call and turns errors into a serializable
 * Result. Logs one line per call: channel, duration and outcome. No payloads.
 */
export function createHandler<C extends IpcChannel, S extends z.ZodType<unknown, IpcInput<C>>>(
  channel: C,
  schema: S,
  run: (input: z.output<S>) => IpcOutput<C>,
  logger: Logger
): HandlerEntry {
  const handler = (rawInput: unknown): Result<IpcOutput<C>> => {
    const startedAt = performance.now()
    const durationMs = (): number => Math.round(performance.now() - startedAt)

    const parsed = schema.safeParse(rawInput)
    if (!parsed.success) {
      logger.warn(channel, { durationMs: durationMs(), code: 'VALIDATION' })
      return { ok: false, code: 'VALIDATION', message: 'invalid input' }
    }

    try {
      const data = run(parsed.data)
      logger.info(channel, { durationMs: durationMs() })
      return { ok: true, data }
    } catch (error) {
      if (error instanceof DomainError) {
        logger.warn(channel, { durationMs: durationMs(), code: error.code })
        return { ok: false, code: error.code, message: error.message }
      }
      logger.error(channel, {
        durationMs: durationMs(),
        code: 'INTERNAL',
        error: redactError(error)
      })
      return { ok: false, code: 'INTERNAL', message: 'internal error' }
    }
  }
  return [channel, handler]
}
