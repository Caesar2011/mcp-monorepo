import { describe, it, expect } from 'vitest'

import { getCurrentDatetime } from './helper.js'

describe('getCurrentDatetime', () => {
  it('should return ISO format', () => {
    const result = getCurrentDatetime({ format: 'iso' })
    expect(result.datetime).toMatch(/^\d{4}-\d{2}-\d{2}T/) // starts with ISO format
    expect(result.format).toBe('iso')
  })

  it('should return UTC format', () => {
    const result = getCurrentDatetime({ format: 'utc' })
    expect(result.datetime).toMatch(/GMT$/) // ends with GMT
    expect(result.format).toBe('utc')
  })

  it('should return timestamp format', () => {
    const result = getCurrentDatetime({ format: 'timestamp' })
    expect(result.datetime).toMatch(/^\d+$/) // all numbers
    expect(result.format).toBe('timestamp')
  })

  it('should return local format by default', () => {
    const result = getCurrentDatetime({})
    expect(typeof result.datetime).toBe('string')
    expect(result.format).toBe('local')
  })
})
