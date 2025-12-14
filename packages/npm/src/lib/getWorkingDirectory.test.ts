import { resolve } from 'path'

import { logger } from '@mcp-monorepo/shared'
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest'

import { getWorkingDirectory } from './getWorkingDirectory.js'

// Mock path module with proper default and named exports
vi.mock('path', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    default: {
      resolve: vi.fn(),
    },
    resolve: vi.fn(),
  }
})

// Mock console and process
vi.mock('@mcp-monorepo/shared', () => ({
  logger: {
    error: vi.fn(),
  },
}))
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

describe('utils', () => {
  let originalArgv: string[]
  let mockResolve: MockedFunction<typeof resolve>

  beforeEach(() => {
    // Store original argv
    originalArgv = [...process.argv]

    // Get the mocked resolve function
    mockResolve = vi.mocked(resolve)

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original argv
    process.argv = originalArgv
  })

  describe('getWorkingDirectory', () => {
    it('should return resolved absolute path when working directory is provided', () => {
      // Arrange
      process.argv = ['node', 'script.js', '/home/user/project']
      mockResolve.mockReturnValue('/resolved/absolute/path')

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith('/home/user/project')
      expect(result).toBe('/resolved/absolute/path')
      expect(logger.error).not.toHaveBeenCalled()
      expect(mockProcessExit).not.toHaveBeenCalled()
    })

    it('should resolve relative path to absolute path', () => {
      // Arrange
      process.argv = ['node', 'script.js', './relative/path']
      mockResolve.mockReturnValue('/current/directory/relative/path')

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith('./relative/path')
      expect(result).toBe('/current/directory/relative/path')
    })

    it('should handle dot notation paths', () => {
      // Arrange
      process.argv = ['node', 'script.js', '.']
      mockResolve.mockReturnValue('/current/directory')

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith('.')
      expect(result).toBe('/current/directory')
    })

    it('should handle parent directory paths', () => {
      // Arrange
      process.argv = ['node', 'script.js', '../parent']
      mockResolve.mockReturnValue('/parent/directory')

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith('../parent')
      expect(result).toBe('/parent/directory')
    })

    it('should handle paths with spaces and special characters', () => {
      // Arrange
      process.argv = ['node', 'script.js', '/path/with spaces/and@special#chars']
      mockResolve.mockReturnValue('/resolved/path/with spaces/and@special#chars')

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith('/path/with spaces/and@special#chars')
      expect(result).toBe('/resolved/path/with spaces/and@special#chars')
    })

    it('should handle Windows-style paths', () => {
      // Arrange
      process.argv = ['node', 'script.js', 'C:\\Users\\test\\project']
      mockResolve.mockReturnValue('C:\\Users\\test\\project')

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith('C:\\Users\\test\\project')
      expect(result).toBe('C:\\Users\\test\\project')
    })

    it('should log error and exit when no working directory is provided', () => {
      // Arrange
      process.argv = ['node', 'script.js']

      // Act & Assert
      expect(() => getWorkingDirectory()).toThrow('process.exit called')
      expect(logger.error).toHaveBeenCalledWith(
        'Error: Working directory not provided as argument. Usage: node <mcp-file> <working_directory>',
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
      expect(mockResolve).not.toHaveBeenCalled()
    })

    it('should log error and exit when working directory is empty string', () => {
      // Arrange
      process.argv = ['node', 'script.js', '']

      // Act & Assert
      expect(() => getWorkingDirectory()).toThrow('process.exit called')
      expect(logger.error).toHaveBeenCalledWith(
        'Error: Working directory not provided as argument. Usage: node <mcp-file> <working_directory>',
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
      expect(mockResolve).not.toHaveBeenCalled()
    })

    it('should log error and exit when working directory is whitespace only', () => {
      // Arrange
      process.argv = ['node', 'script.js', ' ']

      // Act
      const result = getWorkingDirectory()

      // Assert
      // Whitespace-only string is truthy, so it should be processed
      expect(mockResolve).toHaveBeenCalledWith(' ')
      expect(logger.error).not.toHaveBeenCalled()
      expect(mockProcessExit).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should handle argv with additional arguments after working directory', () => {
      // Arrange
      process.argv = ['node', 'script.js', '/working/dir', '--verbose', '--debug']
      mockResolve.mockReturnValue('/resolved/working/dir')

      // Act
      const result = getWorkingDirectory()

      // Assert
      // Should only use the first argument after script name
      expect(mockResolve).toHaveBeenCalledWith('/working/dir')
      expect(result).toBe('/resolved/working/dir')
    })

    it('should handle argv with only script name', () => {
      // Arrange
      process.argv = ['node']

      // Act & Assert
      expect(() => getWorkingDirectory()).toThrow('process.exit called')
      expect(logger.error).toHaveBeenCalledWith(
        'Error: Working directory not provided as argument. Usage: node <mcp-file> <working_directory>',
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle empty argv array', () => {
      // Arrange
      process.argv = []

      // Act & Assert
      expect(() => getWorkingDirectory()).toThrow('process.exit called')
      expect(logger.error).toHaveBeenCalledWith(
        'Error: Working directory not provided as argument. Usage: node <mcp-file> <working_directory>',
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle path.resolve throwing an error', () => {
      // Arrange
      process.argv = ['node', 'script.js', '/invalid/path']
      const resolveError = new Error('Invalid path format')
      mockResolve.mockImplementation(() => {
        throw resolveError
      })

      // Act & Assert
      expect(() => getWorkingDirectory()).toThrow('Invalid path format')
      expect(mockResolve).toHaveBeenCalledWith('/invalid/path')
    })

    it('should return string type consistently', () => {
      // Arrange
      process.argv = ['node', 'script.js', '/test/path']
      mockResolve.mockReturnValue('/resolved/test/path')

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(typeof result).toBe('string')
      expect(result).toBe('/resolved/test/path')
    })

    it('should handle unicode characters in path', () => {
      // Arrange
      const unicodePath = '/home/пользователь/проект/файл'
      process.argv = ['node', 'script.js', unicodePath]
      mockResolve.mockReturnValue(unicodePath)

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith(unicodePath)
      expect(result).toBe(unicodePath)
    })

    it('should handle very long paths', () => {
      // Arrange
      const longPath = '/very/long/path/' + 'segment/'.repeat(100) + 'file'
      process.argv = ['node', 'script.js', longPath]
      mockResolve.mockReturnValue(longPath)

      // Act
      const result = getWorkingDirectory()

      // Assert
      expect(mockResolve).toHaveBeenCalledWith(longPath)
      expect(result).toBe(longPath)
    })
  })
})
