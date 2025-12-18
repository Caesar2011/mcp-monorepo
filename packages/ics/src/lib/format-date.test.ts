import { describe, it, expect } from 'vitest'

import { formatDate } from './format-date.js'

describe('formatDate', () => {
  // NOTE: vitest.setup.ts sets process.env.TZ = 'UTC' to ensure these tests are deterministic.

  it('should format a date for an all-day event', () => {
    const date = new Date('2025-12-25T10:30:00.000Z')
    const result = formatDate(date, true, 'UTC')
    // With TZ=UTC, the output is predictable.
    expect(result).toBe('Thursday, December 25, 2025')
  })

  it('should format a date and time for a non-all-day event', () => {
    const date = new Date('2025-12-25T18:30:00.000Z')
    const result = formatDate(date, false, 'UTC')
    // With TZ=UTC, the output is predictable.
    expect(result).toBe('Thursday, December 25, 2025 at 06:30 PM')
  })

  it('should handle the "allDay" parameter being undefined as false', () => {
    const date = new Date('2025-12-25T18:30:00.000Z')
    const withFalse = formatDate(date, false)
    const withUndefined = formatDate(date)
    expect(withUndefined).toEqual(withFalse)
  })

  it('should correctly format a date at midnight for a non-all-day event', () => {
    const date = new Date('2026-01-01T00:00:00.000Z')
    const result = formatDate(date, false, 'UTC')
    expect(result).toBe('Thursday, January 1, 2026 at 12:00 AM')
  })

  it('should correctly format a date at noon for a non-all-day event', () => {
    const date = new Date('2026-01-01T12:00:00.000Z')
    const result = formatDate(date, false, 'UTC')
    expect(result).toBe('Thursday, January 1, 2026 at 12:00 PM')
  })
})
