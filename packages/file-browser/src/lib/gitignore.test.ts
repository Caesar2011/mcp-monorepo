import { readFile } from 'fs/promises'
import { join, normalize } from 'path'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getWorkingDirectory } from './getWorkingDirectory.js'
import { loadGitignore, isIgnored, resetGitignoreCache } from './gitignore.js'

// Mock dependencies
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('path', async (importOriginal) => ({
  ...(await importOriginal()),
  join: vi.fn(),
  normalize: vi.fn(),
}))

vi.mock('./getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)
const mockJoin = vi.mocked(join)
const mockNormalize = vi.mocked(normalize)
const mockGetWorkingDirectory = vi.mocked(getWorkingDirectory)

const n = (path: string) => path // Simple normalize for tests

describe('gitignore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetGitignoreCache()

    // Default mocks
    mockGetWorkingDirectory.mockReturnValue('/working/dir')
    mockNormalize.mockImplementation((path: string) => n(path))
    mockJoin.mockImplementation((...args: string[]) => args.join('/'))
  })

  afterEach(() => {
    resetGitignoreCache()
  })

  describe('loadGitignore', () => {
    it('should load and parse .gitignore file successfully', async () => {
      const gitignoreContent = `node_modules/\n*.log\n.env`
      mockReadFile.mockResolvedValue(gitignoreContent)

      const ig = await loadGitignore()

      expect(mockJoin).toHaveBeenCalledWith('/working/dir', '.gitignore')
      expect(mockReadFile).toHaveBeenCalledWith('/working/dir/.gitignore', 'utf-8')
      expect(ig).toBeDefined()
    })

    it('should handle missing .gitignore file gracefully', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'))

      const ig = await loadGitignore()

      expect(ig).toBeDefined()
    })

    it('should cache gitignore instance', async () => {
      const gitignoreContent = `node_modules/`
      mockReadFile.mockResolvedValue(gitignoreContent)

      // First call
      await loadGitignore()
      expect(mockReadFile).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await loadGitignore()
      expect(mockReadFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('isIgnored', () => {
    it('should return false for files when no .gitignore exists', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'))

      const result = await isIgnored('src/test.js')

      expect(result).toBe(false)
    })

    it('should ignore files matching .gitignore patterns', async () => {
      const gitignoreContent = `node_modules/\n*.log\n.env\nsrc/temp/`
      mockReadFile.mockResolvedValue(gitignoreContent)

      expect(await isIgnored('node_modules/package')).toBe(true)
      expect(await isIgnored('error.log')).toBe(true)
      expect(await isIgnored('.env')).toBe(true)
      expect(await isIgnored('src/temp/file.txt')).toBe(true)
    })

    it('should not ignore files that do not match patterns', async () => {
      const gitignoreContent = `node_modules/\n*.log`
      mockReadFile.mockResolvedValue(gitignoreContent)

      expect(await isIgnored('src/index.js')).toBe(false)
      expect(await isIgnored('package.json')).toBe(false)
      expect(await isIgnored('README.md')).toBe(false)
    })

    it('should handle directory paths correctly', async () => {
      const gitignoreContent = `build/\ndist`
      mockReadFile.mockResolvedValue(gitignoreContent)

      expect(await isIgnored('build', true)).toBe(true)
      expect(await isIgnored('build/', true)).toBe(true)
      expect(await isIgnored('dist', true)).toBe(true)
      expect(await isIgnored('src', true)).toBe(false)
    })

    it('should normalize paths with backslashes', async () => {
      const gitignoreContent = `temp/\n*.tmp`
      mockReadFile.mockResolvedValue(gitignoreContent)
      mockNormalize.mockImplementation((path: string) => path.replace(/\\/g, '/'))

      expect(await isIgnored('temp\\file.txt')).toBe(true)
      expect(await isIgnored('folder\\file.tmp')).toBe(true)
    })

    it('should handle complex gitignore patterns', async () => {
      const gitignoreContent = `
# Comments
*.log
!important.log
/root-only.txt
src/**/temp/
*.{js,ts}.map`
      mockReadFile.mockResolvedValue(gitignoreContent)

      expect(await isIgnored('debug.log')).toBe(true)
      expect(await isIgnored('important.log')).toBe(false)
      expect(await isIgnored('root-only.txt')).toBe(true)
      expect(await isIgnored('sub/root-only.txt')).toBe(false)
    })
  })

  describe('resetGitignoreCache', () => {
    it('should reset cache and reload gitignore on next call', async () => {
      const gitignoreContent = `node_modules/`
      mockReadFile.mockResolvedValue(gitignoreContent)

      // Load once
      await loadGitignore()
      expect(mockReadFile).toHaveBeenCalledTimes(1)

      // Reset cache
      resetGitignoreCache()

      // Load again - should call readFile again
      await loadGitignore()
      expect(mockReadFile).toHaveBeenCalledTimes(2)
    })
  })
})
