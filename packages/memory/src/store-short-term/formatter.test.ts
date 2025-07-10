import { describe, it, expect } from 'vitest'

import { formatStoreShortTermResult } from './formatter.js'

describe('formatStoreShortTermResult', () => {
  it('should return a formatted string including the memory details', () => {
    const str = formatStoreShortTermResult(1, 'Buy milk', 'reminder')
    expect(str).toMatch(/short-term memory stored successfully/i)
    expect(str).toMatch(/Buy milk/)
    expect(str).toMatch(/reminder/)
  })
})
