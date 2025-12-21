import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { getIcsUrls } from './config.js'

// Mock the logger to prevent console output during tests
vi.mock('@mcp-monorepo/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('getIcsUrls', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Vitest automatically resets process.env, but this is good practice
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return a single calendar source for one valid env var', () => {
    process.env.CALENDAR_PRIVATE = 'https://example.com/private.ics'
    const sources = getIcsUrls()
    expect(sources).toEqual([{ name: 'PRIVATE', url: 'https://example.com/private.ics' }])
  })

  it('should return multiple calendar sources for multiple valid env vars', () => {
    process.env.CALENDAR_WORK = 'http://example.com/work.ics'
    process.env.CALENDAR_PERSONAL = 'https://example.com/personal.ics'
    const sources = getIcsUrls()
    expect(sources).toHaveLength(2)
    expect(sources).toContainEqual({ name: 'WORK', url: 'http://example.com/work.ics' })
    expect(sources).toContainEqual({ name: 'PERSONAL', url: 'https://example.com/personal.ics' })
  })

  it('should throw an error if no CALENDAR_ variables are set', () => {
    process.env = { OTHER_VAR: 'some_value' }
    const expectedError =
      'No calendar sources configured. Please set environment variables starting with "CALENDAR_".\n' +
      'For example: CALENDAR_PRIVATE="https://your-calendar-url/basic.ics"'
    expect(() => getIcsUrls()).toThrow(expectedError)
  })

  it('should throw an error for an invalid URL protocol', () => {
    process.env.CALENDAR_BAD = 'ftp://example.com/calendar.ics'
    expect(() => getIcsUrls()).toThrow(
      'Invalid URL for environment variable CALENDAR_BAD: ftp://example.com/calendar.ics',
    )
  })

  it('should throw an error for a URL without a protocol', () => {
    process.env.CALENDAR_BAD = 'example.com/calendar.ics'
    expect(() => getIcsUrls()).toThrow('Invalid URL for environment variable CALENDAR_BAD: example.com/calendar.ics')
  })

  it('should throw an error for an empty URL string', () => {
    process.env.CALENDAR_EMPTY = ''
    expect(() => getIcsUrls()).toThrow('Invalid URL for environment variable CALENDAR_EMPTY: ')
  })

  it('should ignore other environment variables', () => {
    process.env.CALENDAR_HOME = 'https://example.com/home.ics'
    process.env.NODE_ENV = 'test'
    process.env.ANOTHER_VAR = 'value'
    const sources = getIcsUrls()
    expect(sources).toHaveLength(1)
    expect(sources[0]).toEqual({ name: 'HOME', url: 'https://example.com/home.ics' })
  })

  it('should handle complex names', () => {
    process.env.CALENDAR_SHARED_CALENDAR_V2 = 'https://example.com/shared.ics'
    const sources = getIcsUrls()
    expect(sources).toEqual([{ name: 'SHARED_CALENDAR_V2', url: 'https://example.com/shared.ics' }])
  })
})
