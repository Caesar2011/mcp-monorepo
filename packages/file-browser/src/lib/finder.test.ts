import { describe, it, expect } from 'vitest'

import {
  getFormattedSubstring,
  getLineNumberAtPosition,
  getNthLastLineBreakBeforePosition,
  getNthNextLineBreakAfterPosition,
  getPositionForLineNumber,
} from './finder.js'

describe('getNthLastLineBreakBeforePosition', () => {
  it('should return undefined for an empty string', () => {
    expect(getNthLastLineBreakBeforePosition('', 0, 2)).toBeUndefined()
  })

  it('should return undefined if there are no line breaks', () => {
    expect(getNthLastLineBreakBeforePosition('abcdef', 3, 2)).toBeUndefined()
  })

  it('should return undefined if there is only one line break', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef', 7, 2)).toBeUndefined()
  })

  it('should return undefined if there are fewer than two line breaks before the position', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef\nghi', 5, 2)).toBeUndefined()
  })

  it('should return the index of the second last line break if exactly two exist before the position', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef\nghi', 10, 2)).toBe(3)
  })

  it('should return the index of the second last line break if more than two exist before the position', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef\nghi\njkl\nmno', 15, 2)).toBe(7)
  })

  it('should return undefined if the position is at the start of the string', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef\nghi', 0, 2)).toBeUndefined()
  })

  it('should return the index of the second last line break if the position is at the end of the string', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef\nghi', 11, 2)).toBe(3)
  })

  it('should return the index of the second last line break if the position is in the middle of the string', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef\nghi\njkl', 10, 2)).toBe(3)
  })

  it('should return the index of the second last line break if the position is beyond the length of the string', () => {
    expect(getNthLastLineBreakBeforePosition('abc\ndef\nghi', 20, 2)).toBe(3)
  })
})

describe('getNthNextLineBreakAfterPosition', () => {
  it('should return undefined for an empty string', () => {
    expect(getNthNextLineBreakAfterPosition('', 0, 2)).toBeUndefined()
  })

  it('should return undefined if there are no line breaks', () => {
    expect(getNthNextLineBreakAfterPosition('abcdef', 3, 2)).toBeUndefined()
  })

  it('should return undefined if there is only one line break after the position', () => {
    expect(getNthNextLineBreakAfterPosition('abc\ndef', 0, 2)).toBeUndefined()
  })

  it('should return the index of the second next line break if exactly two exist after the position', () => {
    expect(getNthNextLineBreakAfterPosition('abc\ndef\nghi', 0, 2)).toBe(7)
  })

  it('should return the index of the second next line break if more than two exist after the position', () => {
    expect(getNthNextLineBreakAfterPosition('abc\ndef\nghi\njkl\nmno', 0, 2)).toBe(7)
  })

  it('should return undefined if the position is at the end of the string', () => {
    expect(getNthNextLineBreakAfterPosition('abc\ndef\nghi', 11, 2)).toBeUndefined()
  })

  it('should return the index of the second next line break if the position is in the middle of the string', () => {
    expect(getNthNextLineBreakAfterPosition('abc\ndef\nghi\njkl', 4, 2)).toBe(11)
  })

  it('should return undefined if the position is beyond the length of the string', () => {
    expect(getNthNextLineBreakAfterPosition('abc\ndef\nghi', 20, 2)).toBeUndefined()
  })
})

describe('getLineNumberAtPosition', () => {
  it('should return 1 for an empty string', () => {
    expect(() => getLineNumberAtPosition('', 0)).not.toThrow()
    expect(getLineNumberAtPosition('', 0)).toBe(1)
  })

  it('should return 1 if the position is at the start of the string', () => {
    expect(getLineNumberAtPosition('abc\ndef\nghi', 0)).toBe(1)
  })

  it('should return the correct line number for a position in the middle of the string', () => {
    expect(getLineNumberAtPosition('abc\ndef\nghi', 5)).toBe(2)
  })

  it('should return the correct line number for a position at the end of the string', () => {
    expect(getLineNumberAtPosition('abc\ndef\nghi', 11)).toBe(3)
  })

  it('should throw an error if the position is beyond the length of the string', () => {
    expect(() => getLineNumberAtPosition('abc\ndef\nghi', 20)).toThrow('Position is out of bounds')
  })

  it('should handle strings with no line breaks', () => {
    expect(getLineNumberAtPosition('abcdef', 3)).toBe(1)
  })

  it('should handle strings with multiple line breaks', () => {
    expect(getLineNumberAtPosition('abc\ndef\nghi\njkl\nmno', 15)).toBe(4)
  })
})

describe('getPositionForLineNumber', () => {
  it('should return undefined for an empty string', () => {
    expect(getPositionForLineNumber('', 1)).toBeUndefined()
  })

  it('should return 0 for the first line in a single-line string', () => {
    expect(getPositionForLineNumber('abcdef', 1)).toBe(0)
  })

  it('should return the correct position for the start of a line in a multi-line string', () => {
    expect(getPositionForLineNumber('acb\ndef\nghi', 2)).toBe(4)
    expect(getPositionForLineNumber('abc\ndef\nghi', 3)).toBe(8)
  })

  it('should return undefined if the line number is greater than the number of lines in the string', () => {
    expect(getPositionForLineNumber('abc\ndef\nghi', 5)).toBeUndefined()
  })

  it('should handle strings with no line breaks', () => {
    expect(getPositionForLineNumber('abcdef', 1)).toBe(0)
    expect(getPositionForLineNumber('abcdef', 2)).toBeUndefined()
  })

  it('should handle cases where the line number is 1', () => {
    expect(getPositionForLineNumber('abc\ndef\nghi', 1)).toBe(0)
  })

  it('should handle cases where the line number is at the last line', () => {
    expect(getPositionForLineNumber('abc\ndef\nghi\njkl', 4)).toBe(12)
  })
})

describe('getFormattedSubstring', () => {
  it('should return an empty string for an empty input', () => {
    expect(getFormattedSubstring('', 0, 0)).toBe('')
  })

  it('should return the entire string if there are no line breaks', () => {
    expect(getFormattedSubstring('abcdef', 0, 5)).toBe('1 | abcdef')
  })

  it('should return the formatted substring with line numbers for input with line breaks', () => {
    const input = 'abc\ndef\nghi\njkl\nmno'
    const result = getFormattedSubstring(input, 4, 8)
    expect(result).toBe('1 | abc\n2 | def\n3 | ghi\n4 | jkl')
  })

  it('should handle cases where there are fewer than two line breaks before the start position', () => {
    const input = 'abc\ndef\nghi\njkl\nmno'
    const result = getFormattedSubstring(input, 2, 5)
    expect(result).toBe('1 | abc\n2 | def\n3 | ghi')
  })

  it('should handle cases where there are fewer than two line breaks after the end position', () => {
    const input = 'abc\ndef\nghi\njkl\nmno'
    const result = getFormattedSubstring(input, 13, 18)
    expect(result).toBe('3 | ghi\n4 | jkl\n5 | mno')
  })

  it('should handle cases where startPos and endPos are at the boundaries of the string', () => {
    const input = 'abc\ndef\nghi\njkl\nmno'
    const result = getFormattedSubstring(input, 0, input.length)
    expect(result).toBe('1 | abc\n2 | def\n3 | ghi\n4 | jkl\n5 | mno')
  })

  it('should handle cases where startPos and endPos are in the middle of the string', () => {
    const input = 'abc\ndef\nghi\njkl\nmno'
    const result = getFormattedSubstring(input, 8, 10)
    expect(result).toBe('2 | def\n3 | ghi\n4 | jkl')
  })

  it('should handle cases where startPos and endPos are the same', () => {
    const input = 'abc\ndef\nghi\njkl\nmno'
    const result = getFormattedSubstring(input, 4, 4)
    expect(result).toBe('1 | abc\n2 | def\n3 | ghi')
  })

  it('should handle cases where startPos and endPos are beyond the string length', () => {
    const input = 'abc\ndef\nghi'
    const result = getFormattedSubstring(input, 20, 25)
    expect(result).toBe('2 | def\n3 | ghi')
  })
})
