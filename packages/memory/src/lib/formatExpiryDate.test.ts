import { describe, it, expect } from 'vitest'

import { formatExpiryDate } from './formatExpiryDate.js'

describe('formatExpiryDate', () => {
  it('returns "Never" if undefined provided', () => {
    expect(formatExpiryDate(undefined)).toBe('Never')
  })
  it('returns "Never" if 0 provided', () => {
    expect(formatExpiryDate(0)).toBe('Never')
  })
  it('returns ISO date for UNIX ms epoch', () => {
    expect(formatExpiryDate(1626825600000)).toMatch(/^2021-07-21$/) // 2021-07-21 UTC
  })
  it('returns ISO date for future timestamp', () => {
    const future = Date.now() + 7 * 24 * 60 * 60 * 1000
    expect(formatExpiryDate(future)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('handles negative timestamps (before epoch)', () => {
    expect(formatExpiryDate(-86400000)).toBe('1969-12-31')
  })
  it('returns a string (ISO date) on valid input', () => {
    expect(typeof formatExpiryDate(Date.now())).toBe('string')
  })
})
