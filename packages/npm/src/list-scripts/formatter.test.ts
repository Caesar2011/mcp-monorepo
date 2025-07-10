import { describe, it, expect } from 'vitest'

import { formatScriptsList, formatError } from './formatter.js'

describe('formatScriptsList', () => {
  it('formats non-empty scripts object', () => {
    const result = formatScriptsList({ foo: 'bar', test: 'vitest' })
    expect(result).toContain('foo')
    expect(result).toContain('bar')
    expect(result).toContain('test')
    expect(result).toContain('vitest')
  })

  it('formats empty scripts as no scripts found', () => {
    const result = formatScriptsList({})
    expect(result).toMatch(/no npm scripts found/i)
  })
})

describe('formatError', () => {
  it('formats error message', () => {
    const errMsg = 'boom!'
    expect(formatError(errMsg)).toContain('boom!')
  })
})
