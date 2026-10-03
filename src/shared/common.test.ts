import { describe, expect, it } from 'vitest'
import { nameKey } from './common'

describe('nameKey', () => {
  it('folds case in every alphabet and ignores outer spaces', () => {
    expect(nameKey(' Мама ')).toBe(nameKey('мама'))
    expect(nameKey('ЁЛКА')).toBe('ёлка')
    expect(nameKey('Walmart')).toBe('walmart')
  })
})
