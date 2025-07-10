import { describe, it, expect } from 'vitest'

import { formatResponse, formatError } from './formatter.js'

import type { LsToolResult } from './types.js'

describe('formatResponse', () => {
  it('formats an empty directory', () => {
    const data: LsToolResult = { entries: [], directory: '/mock/path' }
    expect(formatResponse(data)).toBe('Directory: /mock/path\n')
  })

  it('formats directory with files and dirs', () => {
    const data: LsToolResult = {
      entries: [
        { name: 'folder', type: 'DIR' },
        { name: 'file.txt', type: 'FILE', size: 42 },
      ],
      directory: '/mock/root',
    }
    expect(formatResponse(data)).toMatch('DIR \tfolder')
    expect(formatResponse(data)).toMatch('FILE\tfile.txt (42 bytes)')
  })
})

describe('formatError', () => {
  it('formats Error instance', () => {
    const err = new Error('something went wrong')
    expect(formatError(err)).toMatch('something went wrong')
  })
  it('formats non-error', () => {
    expect(formatError('fail')).toMatch('Unknown error')
  })
})
