import { readFile, writeFile, stat } from 'fs/promises'
import { resolve, normalize } from 'path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  validateInput,
  checkFileExists,
  readFileLines,
  parseReplacement,
  findContextMatches,
  findBestContextMatch,
  applyPatch,
  sortPatchesByEndLine,
  applyPatches,
} from './helper.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { PatchFileToolParams, PatchReplacement } from './types.js'

// Mock individual functions
vi.mock('fs/promises', async (importOriginal) => ({
  ...(await importOriginal()),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
}))

vi.mock('path', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  return {
    ...original,
    resolve: vi.fn(),
    normalize: original.normalize,
  }
})

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockStat = vi.mocked(stat)
const mockResolve = vi.mocked(resolve)
const mockGetWorkingDirectory = vi.mocked(getWorkingDirectory)

const n = normalize

describe('findContextMatches', () => {
  const lines = ['a', 'b', 'c', 'd', 'e', 'b', 'c', 'd', 'f', 'g']
  it('returns index for exact match', () => {
    expect(findContextMatches(lines, 1, ['b', 'c'])).toEqual([1, 5])
  })
  it('returns approximate index if context is empty', () => {
    expect(findContextMatches(lines, 3, [])).toEqual([3])
  })
  it('returns empty if context does not match', () => {
    expect(findContextMatches(lines, 1, ['x', 'y'])).toEqual([])
  })
})

describe('validateInput', () => {
  it('should validate correct parameters', () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 3,
          replacement: 'line1\nline2\nline3\nnew content\nline4\nline5\nline6',
        },
      ],
    }

    const result = validateInput(params)
    expect(result).toEqual(params)
  })

  it('should throw error for missing filePath', () => {
    const params = {
      patches: [],
    } as PatchFileToolParams

    expect(() => validateInput(params)).toThrow('filePath is required and must be a string')
  })

  it('should throw error for empty filePath', () => {
    const params: PatchFileToolParams = {
      filePath: ' ',
      patches: [{ startLine: 1, endLine: 2, replacement: 'test' }],
    }

    expect(() => validateInput(params)).toThrow('filePath cannot be empty')
  })

  it('should throw error for empty patches array', () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [],
    }

    expect(() => validateInput(params)).toThrow('patches must be a non-empty array')
  })

  it('should throw error for invalid startLine', () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [{ startLine: 0, endLine: 2, replacement: 'test' }],
    }

    expect(() => validateInput(params)).toThrow('patches[0].startLine must be a positive number')
  })

  it('should throw error for invalid endLine', () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [{ startLine: 1, endLine: -1, replacement: 'test' }],
    }

    expect(() => validateInput(params)).toThrow('patches[0].endLine must be a positive number')
  })

  it('should throw error for startLine > endLine', () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [{ startLine: 5, endLine: 3, replacement: 'test' }],
    }

    expect(() => validateInput(params)).toThrow('patches[0].startLine cannot be greater than endLine')
  })

  it('should throw error for non-string replacement', () => {
    const params = {
      filePath: 'test.txt',
      patches: [{ startLine: 1, endLine: 2, replacement: 123 }],
    } as unknown as PatchFileToolParams

    expect(() => validateInput(params)).toThrow('patches[0].replacement must be a string')
  })
})

describe('checkFileExists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true if file exists and is a file', async () => {
    mockStat.mockResolvedValue({ isFile: () => true } as never)

    const result = await checkFileExists('/path/to/file.txt')
    expect(result).toBe(true)
    expect(mockStat).toHaveBeenCalledWith('/path/to/file.txt')
  })

  it('should return false if path is a directory', async () => {
    mockStat.mockResolvedValue({ isFile: () => false } as never)

    const result = await checkFileExists('/path/to/directory')
    expect(result).toBe(false)
  })

  it('should return false if file does not exist', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    const result = await checkFileExists('/path/to/nonexistent.txt')
    expect(result).toBe(false)
  })
})

describe('readFileLines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should read file and split into lines', async () => {
    const content = 'line1\nline2\nline3'
    mockReadFile.mockResolvedValue(content as never)

    const result = await readFileLines('/path/to/file.txt')

    expect(result).toEqual({
      lines: ['line1', 'line2', 'line3'],
      totalLines: 3,
    })
    expect(mockReadFile).toHaveBeenCalledWith('/path/to/file.txt', 'utf8')
  })

  it('should handle empty file', async () => {
    mockReadFile.mockResolvedValue('' as never)

    const result = await readFileLines('/path/to/empty.txt')

    expect(result).toEqual({
      lines: [''],
      totalLines: 1,
    })
  })

  it('should handle single line file', async () => {
    mockReadFile.mockResolvedValue('single line' as never)

    const result = await readFileLines('/path/to/single.txt')

    expect(result).toEqual({
      lines: ['single line'],
      totalLines: 1,
    })
  })
})

describe('parseReplacement', () => {
  it('should parse normal replacement with context', () => {
    const replacement = 'before1\nbefore2\nbefore3\nnew content line 1\nnew content line 2\nafter1\nafter2\nafter3'

    const result = parseReplacement(replacement)

    expect(result).toEqual({
      beforeContext: ['before1', 'before2', 'before3'],
      newContent: 'new content line 1\nnew content line 2',
      afterContext: ['after1', 'after2', 'after3'],
    })
  })

  it('should parse replacement with <SOF> marker', () => {
    const replacement = '<SOF>\nnew content\nafter1\nafter2\nafter3'

    const result = parseReplacement(replacement)

    expect(result).toEqual({
      beforeContext: [],
      newContent: 'new content',
      afterContext: ['after1', 'after2', 'after3'],
    })
  })

  it('should parse replacement with <EOF> marker', () => {
    const replacement = 'before1\nbefore2\nbefore3\nnew content\n<EOF>'

    const result = parseReplacement(replacement)

    expect(result).toEqual({
      beforeContext: ['before1', 'before2', 'before3'],
      newContent: 'new content',
      afterContext: [],
    })
  })

  it('should throw error for insufficient context lines', () => {
    const replacement = 'before1\nbefore2\nafter1'

    expect(() => parseReplacement(replacement)).toThrow(
      'Replacement must have at least 6 lines: 3 context before + content + 3 context after',
    )
  })

  it('should handle multi-line new content', () => {
    const replacement = 'before1\nbefore2\nbefore3\nline1\nline2\nline3\nafter1\nafter2\nafter3'

    const result = parseReplacement(replacement)

    expect(result.newContent).toBe('line1\nline2\nline3')
  })
})

describe('findBestContextMatch', () => {
  const fileLines = [
    'file line 1',
    'file line 2',
    'file line 3',
    'target line 4',
    'target line 5',
    'target line 6',
    'file line 7',
    'file line 8',
    'file line 9',
  ]

  it('should find exact context match', () => {
    const beforeContext = ['file line 2', 'file line 3']
    const afterContext = ['file line 7', 'file line 8']
    const result = findBestContextMatch(fileLines, 2, 7, beforeContext, afterContext)
    expect(result.matched).toBe(true)
    expect(result.startLine).toBe(1) // index of 'file line 2'
    expect(result.endLine).toBe(7) // index of 'file line 7'
  })

  it('should return false for no match', () => {
    const beforeContext = ['nonexistent', 'context']
    const afterContext = ['also', 'nonexistent']
    const result = findBestContextMatch(fileLines, 4, 6, beforeContext, afterContext)
    expect(result.matched).toBe(false)
  })

  it('should handle empty before context', () => {
    const beforeContext = []
    const afterContext = ['file line 7', 'file line 8']
    const result = findBestContextMatch(fileLines, 4, 6, beforeContext, afterContext)
    expect(result.matched).toBe(true)
    expect(result.startLine).toBe(3)
    expect(result.endLine).toBe(7)
  })

  it('should handle empty after context', () => {
    const beforeContext = ['file line 2', 'file line 3']
    const afterContext = []
    const result = findBestContextMatch(fileLines, 2, 3, beforeContext, afterContext)
    expect(result.matched).toBe(true)
    expect(result.startLine).toBe(1)
    expect(result.endLine).toBe(2)
  })

  it('should choose closest match when multiple matches exist', () => {
    const duplicateFileLines = [
      'line 1',
      'duplicate pattern A',
      'duplicate pattern B',
      'line 4',
      'duplicate pattern A',
      'duplicate pattern B',
      'line 7',
      'line 8',
      'line 9',
      'duplicate pattern A',
      'duplicate pattern B',
      'line 12',
    ]
    const beforeContext = ['duplicate pattern A']
    const afterContext = ['line 7']
    const result = findBestContextMatch(duplicateFileLines, 5, 7, beforeContext, afterContext)
    expect(result.matched).toBe(true)
    expect(result.startLine).toBe(4)
    expect(result.endLine).toBe(6)
  })

  it('should choose first occurrence when both matches are equidistant', () => {
    const duplicateFileLines = ['pattern A', 'pattern B', 'line 3', 'pattern A', 'pattern B', 'line 6']
    const beforeContext = ['pattern A']
    const afterContext = ['line 3']
    const result = findBestContextMatch(duplicateFileLines, 2, 3, beforeContext, afterContext)
    expect(result.matched).toBe(true)
    expect(result.startLine).toBe(0)
    expect(result.endLine).toBe(2)
  })
})

describe('applyPatch', () => {
  const fileLines = [
    'line 0',
    'line 1',
    'line 2',
    'line 3',
    'old line 2',
    'old line 3',
    'line 4',
    'line 5',
    'line 6',
    'line 7',
  ]

  it('should apply patch successfully', () => {
    const patch: PatchReplacement = {
      startLine: 2,
      endLine: 3,
      replacement: 'line 1\nline 2\nline 3\nnew line 2\nnew line 3\nline 4\nline 5\nline 6',
    }

    const result = applyPatch(fileLines, patch)

    expect(result.success).toBe(true)
    expect(result.newLines).toEqual([
      'line 0',
      'line 1',
      'line 2',
      'line 3',
      'new line 2',
      'new line 3',
      'line 4',
      'line 5',
      'line 6',
      'line 7',
    ])
  })

  it('should return error for context not found', () => {
    const patch: PatchReplacement = {
      startLine: 2,
      endLine: 3,
      replacement: 'nonexistent\ncontext\nlines\nnew content\nmore\nnonexistent\nlines',
    }

    const result = applyPatch(fileLines, patch)

    expect(result.success).toBe(false)
    expect(result.error?.reason).toBe('Context not found')
  })

  it('should return error for invalid replacement format', () => {
    const patch: PatchReplacement = {
      startLine: 2,
      endLine: 3,
      replacement: 'invalid',
    }

    const result = applyPatch(fileLines, patch)

    expect(result.success).toBe(false)
    expect(result.error?.reason).toBe('Parse error')
  })
})

describe('sortPatchesByEndLine', () => {
  it('should sort patches by end line in descending order', () => {
    const patches: PatchReplacement[] = [
      { startLine: 1, endLine: 3, replacement: 'patch1' },
      { startLine: 10, endLine: 15, replacement: 'patch2' },
      { startLine: 5, endLine: 8, replacement: 'patch3' },
    ]

    const result = sortPatchesByEndLine(patches)

    expect(result.map((p) => p.endLine)).toEqual([15, 8, 3])
  })

  it('should handle single patch', () => {
    const patches: PatchReplacement[] = [{ startLine: 1, endLine: 3, replacement: 'patch1' }]

    const result = sortPatchesByEndLine(patches)

    expect(result).toEqual(patches)
  })

  it('should not modify original array', () => {
    const patches: PatchReplacement[] = [
      { startLine: 1, endLine: 3, replacement: 'patch1' },
      { startLine: 10, endLine: 15, replacement: 'patch2' },
    ]
    const originalOrder = patches.map((p) => p.endLine)

    sortPatchesByEndLine(patches)

    expect(patches.map((p) => p.endLine)).toEqual(originalOrder)
  })
})

describe('applyPatches', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockGetWorkingDirectory.mockReturnValue(n('/working/dir'))
    mockResolve.mockImplementation((...args: string[]) => {
      const lastArg = args[args.length - 1]
      return n(`/working/dir/${lastArg}`)
    })
  })

  it('should apply patches successfully', async () => {
    const params = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 2,
          replacement: '<SOF>\nnew line 1\nnew line 2\nline 3\nline 4\nline 5',
        },
      ],
    }

    const fileContent = 'line 1\nline 2\nline 3\nline 4\nline 5'

    mockStat.mockResolvedValue({ isFile: () => true } as never)
    mockReadFile.mockResolvedValue(fileContent as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    const result = await applyPatches(params)

    expect(result.appliedPatches).toBe(1)
    expect(result.totalPatches).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(mockWriteFile).toHaveBeenCalled()
  })

  it('should handle file not found error', async () => {
    const params = {
      filePath: 'nonexistent.txt',
      patches: [{ startLine: 1, endLine: 2, replacement: 'test\ntest\ntest\nnew\ntest\ntest\ntest' }],
    }

    mockStat.mockResolvedValue({ isFile: () => false } as never)

    await expect(applyPatches(params)).rejects.toThrow('File does not exist')
  })

  it('should handle path outside working directory', async () => {
    // Mock isSubPath to return false by making resolve return a path outside working dir
    mockResolve.mockReturnValue(n('/outside/dir/file.txt'))

    const params = {
      filePath: '../../../outside/file.txt',
      patches: [{ startLine: 1, endLine: 2, replacement: 'test' }],
    }

    await expect(applyPatches(params)).rejects.toThrow('Access forbidden: File path outside the working directory.')
  })

  it('should handle multiple patches with some failures', async () => {
    const params = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 2,
          replacement: 'line 1\nline 2\nline 3\nnew content\nline 4\nline 5\nline 6',
        },
        {
          startLine: 10,
          endLine: 11,
          replacement: 'nonexistent\ncontext\nlines\nbad patch\nmore\nnonexistent\nlines',
        },
      ],
    }

    const fileContent = 'line 1\nline 2\nline 3\nline 4\nline 5\nline 6'

    mockStat.mockResolvedValue({ isFile: () => true } as never)
    mockReadFile.mockResolvedValue(fileContent as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    const result = await applyPatches(params)

    expect(result.appliedPatches).toBe(1)
    expect(result.totalPatches).toBe(2)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toBe('Context not found')
  })
})
