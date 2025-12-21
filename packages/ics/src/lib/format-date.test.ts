import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { formatDate } from './format-date.js'

describe('formatDate', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    // Set a consistent timezone for tests to ensure toLocaleString is predictable
    process.env.TZ = 'UTC'
  })

  afterEach(() => {
    process.env.TZ = originalTz
  })

  describe('All-day events', () => {
    it('should format a date as YYYY-MM-DD for an all-day event', () => {
      const date = new Date('2025-12-19T14:30:00.000Z')
      expect(formatDate(date, true)).toBe('Friday, December 19, 2025')
    })

    it('should handle dates at the beginning of the day (UTC)', () => {
      const date = new Date('2025-01-01T00:00:00.000Z')
      expect(formatDate(date, true)).toBe('Wednesday, January 1, 2025')
    })

    it('should handle dates at the end of the day (UTC)', () => {
      const date = new Date('2025-03-15T23:59:59.999Z')
      expect(formatDate(date, true)).toBe('Saturday, March 15, 2025')
    })

    it('should handle timezones due to toISOString() being UTC-based', () => {
      // This date is Dec 25 in GMT+2, but Dec 24 in UTC.
      // toISOString().split('T')[0] will return the UTC date.
      const date = new Date('2025-12-25T01:00:00.000+02:00') // This is 2025-12-24T23:00:00.000Z
      expect(date.toISOString()).toBe('2025-12-24T23:00:00.000Z')
      expect(formatDate(date, true)).toBe('Wednesday, December 24, 2025')
    })
  })

  describe('Specific-time events', () => {
    it('should format a date with time using en-US locale', () => {
      const date = new Date('2025-12-19T14:30:00.000Z')
      // With TZ=UTC, the output is predictable
      const expected = 'Friday, December 19, 2025, 02:30 PM'
      // Note: Node's toLocaleString output can vary slightly. Check for main components.
      const result = formatDate(date, false)
      expect(result).toContain('Friday')
      expect(result).toContain('December 19, 2025')
      expect(result).toMatch(/02:30\sPM/)
    })

    it('should format a morning time (AM)', () => {
      const date = new Date('2025-07-04T09:05:00.000Z')
      const result = formatDate(date, false)
      expect(result).toContain('Friday, July 4, 2025')
      expect(result).toMatch(/09:05\sAM/)
    })

    it('should handle midnight', () => {
      const date = new Date('2026-02-01T00:00:00.000Z')
      const result = formatDate(date, false)
      expect(result).toContain('Sunday, February 1, 2026')
      expect(result).toMatch(/12:00\sAM/)
    })
  })
})
