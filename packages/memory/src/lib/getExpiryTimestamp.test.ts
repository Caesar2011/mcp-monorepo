import { describe, it, expect } from 'vitest'

import { getExpiryTimestamp } from './getExpiryTimestamp.js'

describe('getExpiryTimestamp', () => {
  it('returns correct ms timestamp for short_term', () => {
    const now = Date.now()
    const result = getExpiryTimestamp('short_term')
    expect(result).toBeGreaterThanOrEqual(now + 7 * 24 * 60 * 60 * 1000 - 1000) // allow 1s fudge
    expect(result).toBeLessThanOrEqual(now + 7 * 24 * 60 * 60 * 1000 + 1000)
  })
  it('returns correct ms timestamp for mid_term', () => {
    const now = Date.now()
    const result = getExpiryTimestamp('mid_term')
    expect(result).toBeGreaterThanOrEqual(now + 90 * 24 * 60 * 60 * 1000 - 1000)
    expect(result).toBeLessThanOrEqual(now + 90 * 24 * 60 * 60 * 1000 + 1000)
  })
  it('returns null for long_term', () => {
    expect(getExpiryTimestamp('long_term')).toBe(undefined)
  })
  it('throws on invalid input', () => {
    // @ts-expect-error intentional broken
    expect(() => getExpiryTimestamp('banana')).toThrowError()
    // @ts-expect-error missing
    expect(() => getExpiryTimestamp()).toThrowError()
  })
})
