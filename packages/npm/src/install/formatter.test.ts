import { describe, it, expect } from 'vitest'

import { formatInstallResult, formatInstallError } from './formatter.js'

describe('formatInstallResult', () => {
  it('formats standard install output', () => {
    const result = formatInstallResult({ stdout: 'installed!', stderr: '', code: 0 })
    expect(result.content[0].text).toBe('installed!')
    expect(result.content[0]._meta.code).toBe(0)
  })
  it('passes stderr and code in meta', () => {
    const result = formatInstallResult({ stdout: '', stderr: 'warn!', code: 1 })
    expect(result.content[0]._meta.stderr).toBe('warn!')
    expect(result.content[0]._meta.code).toBe(1)
  })
})

describe('formatInstallError', () => {
  it('formats error message', () => {
    const output = formatInstallError('failed')
    expect(output.content[0].text).toContain('failed')
    expect(output.content[0]._meta.stderr).toBe('failed')
  })
})
