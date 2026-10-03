import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { Logger } from '@shared/logger'
import { DomainError } from '../errors'
import { createHandler } from './handler'

function spyLogger(): Logger & { calls: [string, string, unknown][] } {
  const calls: [string, string, unknown][] = []
  const logger = {
    calls,
    debug: vi.fn(),
    info: (message: string, meta?: unknown) => calls.push(['info', message, meta]),
    warn: (message: string, meta?: unknown) => calls.push(['warn', message, meta]),
    error: (message: string, meta?: unknown) => calls.push(['error', message, meta]),
    child: () => logger
  }
  return logger
}

const schema = z.object({ id: z.number().int().positive() })

describe('createHandler', () => {
  it('returns data and logs the channel with its duration', () => {
    const logger = spyLogger()
    const [, handler] = createHandler('accounts:delete', schema, () => null, logger)

    expect(handler({ id: 1 })).toEqual({ ok: true, data: null })
    expect(logger.calls).toEqual([
      ['info', 'accounts:delete', { durationMs: expect.any(Number) as number }]
    ])
  })

  it('rejects invalid input with VALIDATION without calling the service', () => {
    const logger = spyLogger()
    const run = vi.fn(() => null)
    const [, handler] = createHandler('accounts:delete', schema, run, logger)

    expect(handler({ id: -1 })).toMatchObject({ ok: false, code: 'VALIDATION' })
    expect(run).not.toHaveBeenCalled()
    expect(logger.calls[0]?.[0]).toBe('warn')
  })

  it('maps a DomainError to its code', () => {
    const [, handler] = createHandler(
      'accounts:delete',
      schema,
      () => {
        throw new DomainError('NOT_FOUND', 'account 1 not found')
      },
      spyLogger()
    )
    expect(handler({ id: 1 })).toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'account 1 not found'
    })
  })

  it('hides unexpected errors behind INTERNAL and logs them without query params', () => {
    const logger = spyLogger()
    const queryError = Object.assign(new Error('Failed query ... params: 1234'), {
      query: 'insert into accounts ...',
      params: ['1234']
    })
    const [, handler] = createHandler(
      'accounts:delete',
      schema,
      () => {
        throw queryError
      },
      logger
    )

    expect(handler({ id: 1 })).toEqual({ ok: false, code: 'INTERNAL', message: 'internal error' })
    const [level, , meta] = logger.calls[0] ?? []
    expect(level).toBe('error')
    expect(JSON.stringify(meta)).not.toContain('1234')
  })
})
