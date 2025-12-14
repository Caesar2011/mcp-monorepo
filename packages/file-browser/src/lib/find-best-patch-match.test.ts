import { describe, it, expect } from 'vitest'

import { findLongestMatch, findPatchPositions } from './find-best-patch-match.js'

describe('findLongestMatch', () => {
  const fileContent = 'abc\ndef\nghi\njkl\nmno\npqr\nstu\nvwx\nyz'

  it('should return the correct match for a patch at the start of the file', () => {
    const result = findLongestMatch(fileContent, 'abc', 1, true, 2)
    expect(result).toEqual({ maxOverlap: 3, bestMatchPos: 0 })
  })

  it('should return the correct match for a patch at the end of the file', () => {
    const result = findLongestMatch(fileContent, 'yz', 9, true, 2)
    expect(result).toEqual({ maxOverlap: 2, bestMatchPos: 32 })
  })

  it('should return the correct match for a patch in the middle of the file', () => {
    const result = findLongestMatch(fileContent, 'ghi', 3, true, 2)
    expect(result).toEqual({ maxOverlap: 3, bestMatchPos: 8 })
  })

  it('should return undefined if the patch does not exist in the file', () => {
    const result = findLongestMatch(fileContent, 'xyz', 5, true, 2)
    expect(result).toBeUndefined()
  })

  it('should handle cases where the patch is longer than the file content', () => {
    const result = findLongestMatch(fileContent, 'abcdefghijklmnopqrstuvwxyz', 1, true, 2)
    expect(result).toEqual({ maxOverlap: 3, bestMatchPos: 0 })
  })

  it('should handle cases where the approximate line is out of bounds (too high)', () => {
    const result = findLongestMatch(fileContent, 'abc', 20, true, 2)
    expect(result).toBeUndefined()
  })

  it('should handle cases where the approximate line is out of bounds (too low)', () => {
    const result = findLongestMatch(fileContent, 'stu', 1, true, 2)
    expect(result).toBeUndefined()
  })

  it('should handle cases where the radius is 1', () => {
    const result2 = findLongestMatch(fileContent, 'ghi', 2, true, 1)
    expect(result2).toBeUndefined()
    const result3 = findLongestMatch(fileContent, 'ghi', 3, true, 1)
    expect(result3).toEqual({ maxOverlap: 3, bestMatchPos: 8 })
    const result4 = findLongestMatch(fileContent, 'ghi', 4, true, 1)
    expect(result4).toBeUndefined()
  })

  it('should handle cases where the patch is empty', () => {
    const result = findLongestMatch(fileContent, '', 3, true, 2)
    expect(result).toBeUndefined()
  })

  it('should handle cases where the file content is empty', () => {
    const result = findLongestMatch('', 'abc', 1, true, 2)
    expect(result).toBeUndefined()
  })

  it('should handle cases where the patch overlaps partially with the file content', () => {
    const result = findLongestMatch(fileContent, 'defg', 2, true, 2)
    expect(result).toEqual({ maxOverlap: 3, bestMatchPos: 4 })
  })

  it('should handle cases where isStart is false', () => {
    const result = findLongestMatch(fileContent, 'xno\np', 5, false, 2)
    expect(result).toEqual({ maxOverlap: 4, bestMatchPos: 21 })
  })
})

describe('findPatchPositions', () => {
  const fileContent = 'abc\ndef\nghi\njkl\nmno\npqr\nstu\nvwx\nyz'

  it('should return correct start and end positions for a patch in the middle of the file', () => {
    const result = findPatchPositions(fileContent, 'ghi\njkl\nmno', 3, 5)
    expect(result).toEqual({
      patchStartPos: { maxOverlap: 11, bestMatchPos: 8 },
      patchEndPos: { maxOverlap: 11, bestMatchPos: 19 },
    })
  })

  it('should return undefined for both positions if the patch does not exist', () => {
    const result = findPatchPositions(fileContent, '123', 1, 9)
    expect(result).toEqual({ patchStartPos: undefined, patchEndPos: undefined })
  })

  it('should handle cases where the patch is at the start of the file', () => {
    const result = findPatchPositions(fileContent, 'abc\ndef', 1, 2)
    expect(result).toEqual({
      patchStartPos: { maxOverlap: 7, bestMatchPos: 0 },
      patchEndPos: { maxOverlap: 7, bestMatchPos: 7 },
    })
  })

  it('should handle cases where the patch is at the end of the file', () => {
    const result = findPatchPositions(fileContent, 'stu\nvwx\nyz', 7, 9)
    expect(result).toEqual({
      patchStartPos: { maxOverlap: 10, bestMatchPos: 24 },
      patchEndPos: { maxOverlap: 10, bestMatchPos: 34 },
    })
  })

  it('should handle cases where the file content is empty', () => {
    const result = findPatchPositions('', 'abc', 1, 1)
    expect(result).toEqual({ patchStartPos: undefined, patchEndPos: undefined })
  })

  it('should handle cases where the patch is empty', () => {
    const result = findPatchPositions(fileContent, '', 1, 1)
    expect(result).toEqual({ patchStartPos: undefined, patchEndPos: undefined })
  })

  it('should handle cases where the approximate start and end lines are out of bounds', () => {
    const result = findPatchPositions(fileContent, 'abc', 0, 20)
    expect(result).toEqual({ patchStartPos: undefined, patchEndPos: undefined })
  })

  it('should handle cases where the patch overlaps partially with the file content', () => {
    const result = findPatchPositions(fileContent, 'def\n123\njkl', 2, 4)
    expect(result).toEqual({
      patchStartPos: { maxOverlap: 4, bestMatchPos: 4 },
      patchEndPos: { maxOverlap: 4, bestMatchPos: 15 },
    })
  })
})
