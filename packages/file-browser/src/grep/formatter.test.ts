import { describe, it, expect } from 'vitest'

import { formatMatch, formatResponse, formatError } from './formatter.js'

import type { GrepToolResult, GrepMatch } from './types.js'

describe('formatMatch', () => {
  it('should format a match with full context', () => {
    const match: GrepMatch = {
      file: 'src/test.js',
      line: 5,
      match: 'function test() {',
      before: ['line3', 'line4'],
      after: ['line6', 'line7'],
    }

    const result = formatMatch(match)
    const expected = ['src/test.js:5', '3-line3', '4-line4', '5:function test() {', '6-line6', '7-line7'].join('\n')

    expect(result).toBe(expected)
  })

  it('should format a match with no before context', () => {
    const match: GrepMatch = {
      file: 'start.js',
      line: 1,
      match: 'function start() {',
      before: [],
      after: ['line2', 'line3'],
    }

    const result = formatMatch(match)
    const expected = ['start.js:1', '1:function start() {', '2-line2', '3-line3'].join('\n')

    expect(result).toBe(expected)
  })

  it('should format a match with no after context', () => {
    const match: GrepMatch = {
      file: 'end.js',
      line: 3,
      match: 'function end() {',
      before: ['line1', 'line2'],
      after: [],
    }

    const result = formatMatch(match)
    const expected = ['end.js:3', '1-line1', '2-line2', '3:function end() {'].join('\n')

    expect(result).toBe(expected)
  })

  it('should format a match with no context at all', () => {
    const match: GrepMatch = {
      file: 'single.js',
      line: 1,
      match: 'onlyline',
      before: [],
      after: [],
    }

    const result = formatMatch(match)
    const expected = ['single.js:1', '1:onlyline'].join('\n')

    expect(result).toBe(expected)
  })

  it('should format a match with partial context', () => {
    const match: GrepMatch = {
      file: 'partial.js',
      line: 2,
      match: 'function partial() {',
      before: ['line1'],
      after: ['line3'],
    }

    const result = formatMatch(match)
    const expected = ['partial.js:2', '1-line1', '2:function partial() {', '3-line3'].join('\n')

    expect(result).toBe(expected)
  })

  it('should handle paths with special characters', () => {
    const match: GrepMatch = {
      file: 'files with spaces/test-file_v2.js',
      line: 10,
      match: 'const test = "value"',
      before: ['// Setup'],
      after: ['return test'],
    }

    const result = formatMatch(match)
    const expected = [
      'files with spaces/test-file_v2.js:10',
      '9-// Setup',
      '10:const test = "value"',
      '11-return test',
    ].join('\n')

    expect(result).toBe(expected)
  })
})

describe('formatResponse', () => {
  it('should format empty results', () => {
    const data: GrepToolResult = {
      matches: [],
      totalMatches: 0,
      limited: false,
    }

    const result = formatResponse(data)
    expect(result).toBe('No matches found.')
  })

  it('should format single match', () => {
    const data: GrepToolResult = {
      matches: [
        {
          file: 'test.js',
          line: 1,
          match: 'function test() {',
          before: [],
          after: ['return true'],
        },
      ],
      totalMatches: 1,
      limited: false,
    }

    const result = formatResponse(data)
    const expected = ['test.js:1', '1:function test() {', '2-return true'].join('\n')

    expect(result).toBe(expected)
  })

  it('should format multiple matches with separator', () => {
    const data: GrepToolResult = {
      matches: [
        {
          file: 'file1.js',
          line: 1,
          match: 'function first() {',
          before: [],
          after: ['return 1'],
        },
        {
          file: 'file2.js',
          line: 3,
          match: 'function second() {',
          before: ['// Comment'],
          after: ['return 2'],
        },
      ],
      totalMatches: 2,
      limited: false,
    }

    const result = formatResponse(data)
    const expected = [
      'file1.js:1',
      '1:function first() {',
      '2-return 1',
      '--',
      'file2.js:3',
      '2-// Comment',
      '3:function second() {',
      '4-return 2',
    ].join('\n')

    expect(result).toBe(expected)
  })

  it('should add limitation note when results are limited', () => {
    const data: GrepToolResult = {
      matches: [
        {
          file: 'test.js',
          line: 1,
          match: 'function test() {',
          before: [],
          after: [],
        },
      ],
      totalMatches: 30,
      limited: true,
    }

    const result = formatResponse(data)
    expect(result).toContain('Note: Results limited to 30 matches. There may be more matches available.')
  })

  it('should handle matches with empty lines in context', () => {
    const data: GrepToolResult = {
      matches: [
        {
          file: 'empty.js',
          line: 3,
          match: 'function test() {',
          before: ['', 'line2'],
          after: ['', ''],
        },
      ],
      totalMatches: 1,
      limited: false,
    }

    const result = formatResponse(data)
    const expected = ['empty.js:3', '1-', '2-line2', '3:function test() {', '4-', '5-'].join('\n')

    expect(result).toBe(expected)
  })

  it('should handle matches with unicode content', () => {
    const data: GrepToolResult = {
      matches: [
        {
          file: 'unicode.js',
          line: 1,
          match: 'const 测试 = "test"',
          before: [],
          after: ['console.log(测试)'],
        },
      ],
      totalMatches: 1,
      limited: false,
    }

    const result = formatResponse(data)
    const expected = ['unicode.js:1', '1:const 测试 = "test"', '2-console.log(测试)'].join('\n')

    expect(result).toBe(expected)
  })

  it('should handle large number of matches with limitation', () => {
    const matches = new Array(30).fill(undefined).map((_, i) => ({
      file: `file${i}.js`,
      line: 1,
      match: 'function test() {',
      before: [],
      after: [],
    }))

    const data: GrepToolResult = {
      matches,
      totalMatches: 30,
      limited: true,
    }

    const result = formatResponse(data)
    expect(result.split('--').length).toBe(30) // 30 matches separated by '--'
    expect(result).toContain('Note: Results limited to 30 matches')
  })
})

describe('formatError', () => {
  it('should format Error objects', () => {
    const error = new Error('File not found')
    const result = formatError(error)
    expect(result).toBe('Error: File not found')
  })

  it('should format string errors', () => {
    const error = 'Invalid regex pattern'
    const result = formatError(error)
    expect(result).toBe('Error: Invalid regex pattern')
  })

  it('should format unknown error types', () => {
    const error = { code: 'ENOENT', message: 'Not found' }
    const result = formatError(error)
    expect(result).toBe('Error: Unknown error')
  })

  it('should handle null/undefined errors', () => {
    expect(formatError(undefined)).toBe('Error: Unknown error')
  })

  it('should handle empty string errors', () => {
    const result = formatError('')
    expect(result).toBe('Error: ')
  })

  it('should handle number errors', () => {
    const error = 404
    const result = formatError(error)
    expect(result).toBe('Error: Unknown error')
  })

  it('should handle regex errors', () => {
    const error = new SyntaxError('Invalid regular expression: /[/: Unterminated character class')
    const result = formatError(error)
    expect(result).toBe('Error: Invalid regular expression: /[/: Unterminated character class')
  })
})
