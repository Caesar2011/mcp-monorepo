import { resolve } from 'path'

import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest'

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
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

import { getWorkingDirectory } from './getWorkingDirectory.js'

describe('utils', () => {
  let originalArgv: string[]
  let originalEnv: NodeJS.ProcessEnv
  let mockResolve: MockedFunction<typeof resolve>

  beforeEach(() => {
    // Store original argv and env
    originalArgv = [...process.argv]
    originalEnv = { ...process.env }

    // Get the mocked resolve function
    mockResolve = vi.mocked(resolve)

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original argv and env
    process.argv = originalArgv
    process.env = originalEnv
  })

  describe('getWorkingDirectory', () => {
    it('should use WORKING_DIR env if set', () => {
      process.env.WORKING_DIR = '/env/special/dir'
      process.argv = ['node', 'script.js', '/cli/ignored']
      mockResolve.mockReturnValue('/resolved/from/env')

      const result = getWorkingDirectory()
      expect(mockResolve).toHaveBeenCalledWith('/env/special/dir')
      expect(result).toBe('/resolved/from/env')
      expect(mockConsoleError).not.toHaveBeenCalled()
      expect(mockProcessExit).not.toHaveBeenCalled()
    })

    it('should prefer WORKING_DIR env even if empty string passed as CLI arg', () => {
      process.env.WORKING_DIR = '/env/dir'
      process.argv = ['node', 'script.js', '']
      mockResolve.mockReturnValue('/resolved/env/dir')

      const result = getWorkingDirectory()
      expect(mockResolve).toHaveBeenCalledWith('/env/dir')
      expect(result).toBe('/resolved/env/dir')
    })

    it('should fallback to CLI arg if WORKING_DIR env not set', () => {
      delete process.env.WORKING_DIR
      process.argv = ['node', 'script.js', '/cli/dir']
      mockResolve.mockReturnValue('/resolved/from/cli')
      const result = getWorkingDirectory()
      expect(mockResolve).toHaveBeenCalledWith('/cli/dir')
      expect(result).toBe('/resolved/from/cli')
    })

    // ... alle bestehenden Tests bleiben erhalten ...
  })
})
