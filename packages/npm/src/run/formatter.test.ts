import { describe, it, expect } from 'vitest'

import { formatRunResult, formatRunError } from './formatter.js'

describe('formatRunResult', () => {
  it('returns correct CallToolResult structure for normal output', () => {
    const result = formatRunResult({ stdout: 'some output', stderr: '', code: 0 })
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toBe('some output')
    expect(result.content[0]._meta.code).toBe(0)
  })

  it('returns stderr and code correctly', () => {
    const result = formatRunResult({ stdout: '', stderr: 'error!', code: 123 })
    expect(result.content[0]._meta.stderr).toBe('error!')
    expect(result.content[0]._meta.code).toBe(123)
  })
})

describe('formatRunError', () => {
  it('formats error messages clearly', () => {
    const output = formatRunError('errormsg')
    expect(output.content[0].text).toContain('errormsg')
    expect(output.content[0]._meta.stderr).toBe('errormsg')
  })
})
