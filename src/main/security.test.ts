import { describe, expect, it } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import { noopLogger } from '@shared/logger'
import { isAppUrl, isSafeExternalUrl, trustedSenderOnly } from './security'

describe('isAppUrl', () => {
  const devUrl = 'http://localhost:5173'
  const prodUrl =
    'file:///C:/Program%20Files/money-folder/resources/app.asar/out/renderer/index.html'

  it('accepts any page of the dev server', () => {
    expect(isAppUrl('http://localhost:5173/#/accounts', devUrl)).toBe(true)
    expect(isAppUrl('http://localhost:5173/src/main.ts', devUrl)).toBe(true)
  })

  it('rejects other origins in development', () => {
    expect(isAppUrl('http://localhost:5174/', devUrl)).toBe(false)
    expect(isAppUrl('https://localhost:5173/', devUrl)).toBe(false)
    expect(isAppUrl('https://example.com/', devUrl)).toBe(false)
  })

  it('accepts only the bundled index.html in production', () => {
    expect(isAppUrl(`${prodUrl}#/transactions`, prodUrl)).toBe(true)
    expect(isAppUrl('file:///C:/Users/me/Downloads/evil.html', prodUrl)).toBe(false)
    expect(isAppUrl('https://example.com/', prodUrl)).toBe(false)
  })

  it('rejects what is not a URL', () => {
    expect(isAppUrl('', prodUrl)).toBe(false)
    expect(isAppUrl('not a url', devUrl)).toBe(false)
  })
})

describe('isSafeExternalUrl', () => {
  it('allows https only', () => {
    expect(isSafeExternalUrl('https://github.com/bruhlord-s/money-folder')).toBe(true)
    for (const url of [
      'http://example.com',
      'file:///C:/Windows/System32/calc.exe',
      'javascript:alert(1)',
      'ms-settings:privacy',
      'not a url'
    ]) {
      expect(isSafeExternalUrl(url)).toBe(false)
    }
  })
})

describe('trustedSenderOnly', () => {
  const appUrl = 'http://localhost:5173'
  const handler = trustedSenderOnly('accounts:list', (input) => ({ echoed: input }), {
    appUrl,
    logger: noopLogger
  })
  const from = (url: string | null): Pick<IpcMainInvokeEvent, 'senderFrame'> =>
    ({ senderFrame: url === null ? null : { url } }) as Pick<IpcMainInvokeEvent, 'senderFrame'>

  it("runs the handler for the app's own page", () => {
    expect(handler(from('http://localhost:5173/#/accounts'), 1)).toEqual({ echoed: 1 })
  })

  it('throws for foreign or destroyed frames', () => {
    expect(() => handler(from('https://example.com/'), 1)).toThrow('untrusted sender')
    expect(() => handler(from(null), 1)).toThrow('untrusted sender')
  })
})
