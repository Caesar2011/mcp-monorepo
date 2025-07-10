import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatTreeResponse, formatTreeError } from './formatter.js'
import { treeHandler } from './handler.js'
import { buildDirectoryTree } from './helper.js'

import type { TreeToolParams, TreeToolResult } from './types.js'

// Mock dependencies
vi.mock('./helper.js', () => ({
  buildDirectoryTree: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatTreeResponse: vi.fn(),
  formatTreeError: vi.fn(),
}))

const mockBuildDirectoryTree = vi.mocked(buildDirectoryTree)
const mockFormatTreeResponse = vi.mocked(formatTreeResponse)
const mockFormatTreeError = vi.mocked(formatTreeError)

describe('treeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful tree building', async () => {
    const mockResult: TreeToolResult = {
      tree: {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [
          {
            name: 'file.txt',
            type: 'FILE',
            size: 100,
            path: 'file.txt',
          },
        ],
      },
      totalFiles: 1,
      totalDirectories: 1,
      maxDepthReached: 1,
      truncated: false,
    }

    const formattedResponse = `Tree Summary: Files: 1 | Directories: 1\n\n{"tree": ...}`

    mockBuildDirectoryTree.mockResolvedValue(mockResult)
    mockFormatTreeResponse.mockReturnValue(formattedResponse)

    const params: TreeToolParams = { path: '.', depth: 3 }
    const result = await treeHandler(params)

    expect(mockBuildDirectoryTree).toHaveBeenCalledWith(params)
    expect(mockFormatTreeResponse).toHaveBeenCalledWith(mockResult)
    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toEqual({
      type: 'text',
      text: formattedResponse,
    })
  })

  it('should handle tree building errors', async () => {
    const error = new Error('Access forbidden: Directory outside the working directory.')
    const formattedError = 'Tree Error: Access forbidden: Directory outside the working directory.'

    mockBuildDirectoryTree.mockRejectedValue(error)
    mockFormatTreeError.mockReturnValue(formattedError)

    const params: TreeToolParams = { path: '../outside' }
    const result = await treeHandler(params)

    expect(mockBuildDirectoryTree).toHaveBeenCalledWith(params)
    expect(mockFormatTreeError).toHaveBeenCalledWith(error)
    expect(result.content).toHaveLength(1)
    expect(result.content[0]).toEqual({
      type: 'text',
      text: formattedError,
      _meta: { stderr: 'Access forbidden: Directory outside the working directory.' },
    })
  })

  it('should handle unknown errors', async () => {
    const error = 'Unknown error'
    const formattedError = 'Tree Error: Unknown error occurred'

    mockBuildDirectoryTree.mockRejectedValue(error)
    mockFormatTreeError.mockReturnValue(formattedError)

    const params: TreeToolParams = { path: '.' }
    const result = await treeHandler(params)

    expect(mockFormatTreeError).toHaveBeenCalledWith(error)
    expect(result.content[0]).toEqual({
      type: 'text',
      text: formattedError,
      _meta: { stderr: 'Unknown error' },
    })
  })

  it('should handle empty parameters', async () => {
    const mockResult: TreeToolResult = {
      tree: {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [],
      },
      totalFiles: 0,
      totalDirectories: 1,
      maxDepthReached: 0,
      truncated: false,
    }

    const formattedResponse = `Tree Summary: Files: 0 | Directories: 1\n\n{"tree": ...}`

    mockBuildDirectoryTree.mockResolvedValue(mockResult)
    mockFormatTreeResponse.mockReturnValue(formattedResponse)

    const params: TreeToolParams = {} // empty params
    const result = await treeHandler(params)

    expect(mockBuildDirectoryTree).toHaveBeenCalledWith(params)
    expect(result.content[0].type).toBe('text')
  })

  it('should handle truncated results', async () => {
    const mockResult: TreeToolResult = {
      tree: {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [], // Simplified for test
      },
      totalFiles: 150,
      totalDirectories: 50,
      maxDepthReached: 5,
      truncated: true,
    }

    const formattedResponse = `Tree Summary: Files: 150 | Directories: 50 | ⚠️ Results truncated\n\n{"tree": ...}`

    mockBuildDirectoryTree.mockResolvedValue(mockResult)
    mockFormatTreeResponse.mockReturnValue(formattedResponse)

    const params: TreeToolParams = { path: '.', depth: 5 }
    const result = await treeHandler(params)

    expect(mockFormatTreeResponse).toHaveBeenCalledWith(mockResult)
    expect(result.content[0].text).toBe(formattedResponse)
  })

  it('should pass through custom depth parameter', async () => {
    const mockResult: TreeToolResult = {
      tree: { name: 'root', type: 'DIR', path: '.', children: [] },
      totalFiles: 0,
      totalDirectories: 1,
      maxDepthReached: 0,
      truncated: false,
    }

    mockBuildDirectoryTree.mockResolvedValue(mockResult)
    mockFormatTreeResponse.mockReturnValue('formatted')

    const params: TreeToolParams = { path: 'src', depth: 2 }
    await treeHandler(params)

    expect(mockBuildDirectoryTree).toHaveBeenCalledWith({
      path: 'src',
      depth: 2,
    })
  })

  it('should handle filesystem permission errors', async () => {
    const error = new Error("EACCES: permission denied, scandir 'restricted'")
    const formattedError = "Tree Error: EACCES: permission denied, scandir 'restricted'"

    mockBuildDirectoryTree.mockRejectedValue(error)
    mockFormatTreeError.mockReturnValue(formattedError)

    const params: TreeToolParams = { path: 'restricted' }
    const result = await treeHandler(params)

    expect(result.content[0]).toEqual({
      type: 'text',
      text: formattedError,
      _meta: { stderr: "EACCES: permission denied, scandir 'restricted'" },
    })
  })
})
