import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest'
import fs from 'fs/promises'
import { join, normalize } from 'path'
import { tmpdir } from 'os'
import {
  validatePath,
  shouldIgnorePath,
  getGitignorePatterns,
  isGitAvailable,
  searchRecursiveForFiles,
  buildDirectoryTree,
  searchInFileForPattern,
  searchRecursiveForPattern,
} from './helpers.js'

// Mock modules
vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('util', () => {
  const mockExec = vi.fn(() => ({ stdout: 'string', stderr: 'string' }))
  return {
    _mockExec: mockExec,
    promisify: vi.fn(() => mockExec),
  }
})

describe('file-browser edge cases', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'file-browser-test-'))
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // empty
    }
    vi.clearAllMocks()
  })

  describe('validatePath', () => {
    it.each([
      // Valid paths within working directory
      ['/home/user', 'file.txt', true],
      ['/home/user', './file.txt', true],
      ['/home/user', 'subdir/file.txt', true],
      // Path traversal attacks
      ['/home/user', '../../../etc/passwd', false],
      ['/home/user', '../../file.txt', false],
      ['/home/user', '../file.txt', false],
      // Absolute paths outside working directory
      ['/home/user', '/etc/passwd', false],
      ['/home/user', '/tmp/file.txt', false],
      // Windows-style paths
      ['C:\\Users\\test', '..\\..\\Windows\\system32', false],
      ['C:\\Users\\test', 'file.txt', true],
      // Empty and null paths
      ['/home/user', '', true],
      ['', 'file.txt', true],
      // Special characters in paths
      ['/home/user', 'file with spaces.txt', true],
      ['/home/user', 'file@#$%.txt', true],
      ['/home/user', 'файл.txt', true],
      // Symlink-like patterns
      ['/home/user', './././file.txt', true],
      ['/home/user', 'dir/../file.txt', true],
    ])('should validate path "%s" + "%s" -> %s', (workingDir, relativePath, expected) => {
      expect(validatePath(workingDir, relativePath)).toBe(expected)
    })
  })

  describe('shouldIgnorePath', () => {
    it.each([
      // Standard patterns
      ['node_modules/package', ['node_modules', '.git', '*.log'], true],
      ['src/.git/config', ['node_modules', '.git', '*.log'], true],
      ['debug.log', ['node_modules', '.git', '*.log'], true],
      // Directory patterns with trailing slash
      ['dist/index.js', ['dist/', 'build/'], true],
      ['src/build/output', ['dist/', 'build/'], true],
      ['dist-backup/file', ['dist/', 'build/'], false],
      // Check that path beginning with a slsh only matches cmd root
      ['dist-backup/sub/file', ['/dist'], false],
      ['dist-backup/sub/file', ['/dist-backup'], true],
      ['dist-backup/sub/file', ['/sub'], false],
      // Comment lines and empty patterns
      ['# This is a comment', ['# This is a comment', '', '   ', 'node_modules'], false],
      ['some/file', ['# This is a comment', '', '   ', 'node_modules'], false],
      ['node_modules/pkg', ['# This is a comment', '', '   ', 'node_modules'], true],
      // Windows path separators
      ['src\\node_modules\\pkg', ['node_modules', 'dist/'], true],
      ['dist\\index.js', ['node_modules', 'dist/'], true],
      // Exact matches vs partial matches
      ['test/file.js', ['test'], true],
      ['my-test/file.js', ['test'], true],
      ['file.test', ['test'], true],
      // Empty pattern array
      ['any/file', [], false],
      // Special regex characters in patterns
      ['app.log', ['*.log', '?(temp)', '[0-9]+.tmp'], true],
      ['?(temp)/file', ['*.log', '?(temp)', '[0-9]+.tmp'], true],
    ])('should check if path "%s" should be ignored with patterns %j -> %s', (path, patterns, expected) => {
      console.log('TEST:', path, patterns, expected)
      expect(shouldIgnorePath(path, patterns)).toBe(expected)
    })
  })

  describe('getGitignorePatterns', () => {
    it('should read valid .gitignore file', async () => {
      const gitignorePath = join(tempDir, '.gitignore')
      await fs.writeFile(gitignorePath, 'node_modules\n.env\n# comment\n\ndist/')

      const patterns = await getGitignorePatterns(tempDir)
      expect(patterns).toEqual(['node_modules', '.env', 'dist/'])
    })

    it('should return default patterns when .gitignore is missing', async () => {
      const patterns = await getGitignorePatterns('/nonexistent/path')
      expect(patterns).toEqual(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'])
    })

    it('should handle empty .gitignore file', async () => {
      const gitignorePath = join(tempDir, '.gitignore')
      await fs.writeFile(gitignorePath, '')

      const patterns = await getGitignorePatterns(tempDir)
      expect(patterns).toEqual([])
    })

    it('should handle .gitignore with only comments and empty lines', async () => {
      const gitignorePath = join(tempDir, '.gitignore')
      await fs.writeFile(gitignorePath, '# Comment 1\n\n# Comment 2\n   \n')

      const patterns = await getGitignorePatterns(tempDir)
      expect(patterns).toEqual([])
    })

    it('should handle .gitignore with mixed content', async () => {
      const gitignorePath = join(tempDir, '.gitignore')
      await fs.writeFile(gitignorePath, '# Dependencies\nnode_modules\n\n# Logs\n*.log\n\n# Build\ndist/')

      const patterns = await getGitignorePatterns(tempDir)
      expect(patterns).toEqual(['node_modules', '*.log', 'dist/'])
    })

    it('should handle permission errors', async () => {
      // WARNING: Untested
      if (process.platform === 'win32') {
        return
      }
      const gitignorePath = join(tempDir, '.gitignore')
      await fs.writeFile(gitignorePath, 'node_modules')
      await fs.chmod(gitignorePath, 0o000)

      const patterns = await getGitignorePatterns(tempDir)
      expect(patterns).toEqual(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'])

      // Restore permissions for cleanup
      await fs.chmod(gitignorePath, 0o644)
    })

    it('should handle binary/invalid UTF-8 content', async () => {
      const gitignorePath = join(tempDir, '.gitignore')
      const binaryData = Buffer.from([0xff, 0xfe, 0x00, 0x00])
      await fs.writeFile(gitignorePath, binaryData)

      const patterns = await getGitignorePatterns(tempDir)
      expect(patterns).toEqual(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'])
    })
  })

  describe('isGitAvailable', () => {
    let mockExec: MockedFunction<() => { stdout: string; stderr: string }>
    beforeEach(async () => {
      const { _mockExec } = (await import('util')) as unknown as {
        _mockExec: MockedFunction<() => { stdout: string; stderr: string }>
      }
      mockExec = _mockExec
    })

    it('should return true when git is available', async () => {
      mockExec.mockResolvedValue({ stdout: 'git version 2.30.0', stderr: '' })

      const result = await isGitAvailable()
      expect(result).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('git --version')
    })

    it('should return false when git is not available', async () => {
      mockExec.mockRejectedValue(new Error('git: command not found'))

      const result = await isGitAvailable()
      expect(result).toBe(false)
    })

    it('should return false when git command fails', async () => {
      mockExec.mockRejectedValue({ code: 127, message: 'Command failed' })

      const result = await isGitAvailable()
      expect(result).toBe(false)
    })

    it('should handle timeout errors', async () => {
      mockExec.mockRejectedValue(new Error('ETIMEDOUT'))

      const result = await isGitAvailable()
      expect(result).toBe(false)
    })
  })

  describe('searchRecursiveForFiles', () => {
    it('should find files matching simple pattern', async () => {
      await fs.writeFile(join(tempDir, 'test.txt'), 'content')
      await fs.writeFile(join(tempDir, 'test.js'), 'code')
      await fs.writeFile(join(tempDir, 'other.py'), 'python')

      const results: string[] = []
      await searchRecursiveForFiles(tempDir, tempDir, 'test', [], results)

      expect(results).toContain('test.txt')
      expect(results).toContain('test.js')
      expect(results).not.toContain('other.py')
    })

    it('should handle wildcard patterns', async () => {
      await fs.writeFile(join(tempDir, 'file1.txt'), 'content')
      await fs.writeFile(join(tempDir, 'file2.txt'), 'content')
      await fs.writeFile(join(tempDir, 'script.js'), 'code')

      const results: string[] = []
      await searchRecursiveForFiles(tempDir, tempDir, '*.txt', [], results)

      expect(results).toContain('file1.txt')
      expect(results).toContain('file2.txt')
      expect(results).not.toContain('script.js')
    })

    it('should respect gitignore patterns', async () => {
      const nodeModules = join(tempDir, 'node_modules')
      await fs.mkdir(nodeModules)
      await fs.writeFile(join(nodeModules, 'package.json'), '{}')
      await fs.writeFile(join(tempDir, 'src.js'), 'code')

      const results: string[] = []
      await searchRecursiveForFiles(tempDir, tempDir, '*', ['node_modules'], results)

      expect(results).toContain('src.js')
      expect(results).not.toContain(normalize('node_modules/package.json'))
    })

    it('should handle deeply nested directories', async () => {
      const deepPath = join(tempDir, 'a', 'b', 'c', 'd', 'e')
      await fs.mkdir(deepPath, { recursive: true })
      await fs.writeFile(join(deepPath, 'deep.txt'), 'content')

      const results: string[] = []
      await searchRecursiveForFiles(tempDir, tempDir, 'deep', [], results)

      expect(results).toContain(normalize('a/b/c/d/e/deep.txt'))
    })

    it('should handle permission denied errors gracefully', async () => {
      const restrictedDir = join(tempDir, 'restricted')
      await fs.mkdir(restrictedDir)
      await fs.writeFile(join(restrictedDir, 'secret.txt'), 'content')
      await fs.chmod(restrictedDir, 0o000)

      const results: string[] = []
      // Should not throw, should handle error gracefully
      await searchRecursiveForFiles(tempDir, tempDir, 'secret', [], results)

      expect(results).not.toContain(expect.stringContaining('secret.txt'))

      // Restore permissions for cleanup
      await fs.chmod(restrictedDir, 0o755)
    })

    it('should handle path validation failures', async () => {
      const results: string[] = []
      await searchRecursiveForFiles('/etc/passwd', tempDir, 'test', [], results)

      expect(results).toHaveLength(0)
    })

    it('should handle empty directory', async () => {
      const emptyDir = join(tempDir, 'empty')
      await fs.mkdir(emptyDir)

      const results: string[] = []
      await searchRecursiveForFiles(emptyDir, tempDir, 'test', [], results)

      expect(results).toHaveLength(0)
    })
  })

  describe('buildDirectoryTree', () => {
    it('should build simple directory tree', async () => {
      await fs.writeFile(join(tempDir, 'file1.txt'), 'content')
      const subDir = join(tempDir, 'subdir')
      await fs.mkdir(subDir)
      await fs.writeFile(join(subDir, 'file2.txt'), 'content')

      const results: string[] = []
      const fileCount = { count: 0 }
      await buildDirectoryTree(tempDir, tempDir, 1, 5, [], results, fileCount)

      expect(results.some((line) => /file1\.txt$/.test(line))).toBe(true)
      expect(results.some((line) => /subdir\/$/.test(line))).toBe(true)
      expect(results.some((line) => /file2\.txt$/.test(line))).toBe(true)
    })

    it('should respect max depth limit', async () => {
      const deepPath = join(tempDir, 'a', 'b', 'c')
      await fs.mkdir(deepPath, { recursive: true })
      await fs.writeFile(join(deepPath, 'deep.txt'), 'content')

      const results: string[] = []
      const fileCount = { count: 0 }
      await buildDirectoryTree(tempDir, tempDir, 1, 2, [], results, fileCount)

      expect(results.some((line) => /a\/$/.test(line))).toBe(true)
      expect(results.some((line) => /b\/$/.test(line))).toBe(true)
      expect(results.every((line) => !/deep\.txt$/.test(line))).toBe(true)
    })

    it('should respect file count limit', async () => {
      // Create many files
      for (let i = 0; i < 250; i++) {
        await fs.writeFile(join(tempDir, `file${i}.txt`), 'content')
      }

      const results: string[] = []
      const fileCount = { count: 0 }
      await buildDirectoryTree(tempDir, tempDir, 1, 5, [], results, fileCount)

      expect(fileCount.count).toBeLessThanOrEqual(200)
    })

    it('should handle gitignore patterns', async () => {
      const nodeModules = join(tempDir, 'node_modules')
      await fs.mkdir(nodeModules)
      await fs.writeFile(join(nodeModules, 'package.json'), '{}')
      await fs.writeFile(join(tempDir, 'src.js'), 'code')

      const results: string[] = []
      const fileCount = { count: 0 }
      await buildDirectoryTree(tempDir, tempDir, 1, 5, ['node_modules'], results, fileCount)

      expect(results.some((line) => /src\.js$/.test(line))).toBe(true)
      expect(results.every((line) => !/node_modules/.test(line))).toBe(true)
    })

    it('should handle permission errors', async () => {
      const restrictedDir = join(tempDir, 'restricted')
      await fs.mkdir(restrictedDir)
      await fs.chmod(restrictedDir, 0o000)

      const results: string[] = []
      const fileCount = { count: 0 }
      await buildDirectoryTree(tempDir, tempDir, 1, 5, [], results, fileCount)

      // Should not throw, should handle error gracefully
      expect(results.some((line) => /restricted/.test(line))).toBe(true)

      // Restore permissions for cleanup
      await fs.chmod(restrictedDir, 0o755)
    })

    it('should handle empty directories', async () => {
      const emptyDir = join(tempDir, 'empty')
      await fs.mkdir(emptyDir)

      const results: string[] = []
      const fileCount = { count: 0 }
      await buildDirectoryTree(tempDir, tempDir, 1, 5, [], results, fileCount)

      expect(results.some((line) => /empty\/$/.test(line))).toBe(true)
    })
  })

  describe('searchInFileForPattern', () => {
    it('should find pattern in file with context', async () => {
      const filePath = join(tempDir, 'test.txt')
      const content = 'line1\nTARGET line\nline3\nline4\nTARGET again\nline6'
      await fs.writeFile(filePath, content)

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchInFileForPattern(filePath, tempDir, 'TARGET', results, matchCount)

      expect(matchCount.count).toBe(2)
      expect(results.join('\n')).toContain('TARGET line')
      expect(results.join('\n')).toContain('TARGET again')
    })

    it('should respect match count limit', async () => {
      const filePath = join(tempDir, 'test.txt')
      const content = Array(100).fill('TARGET line').join('\n')
      await fs.writeFile(filePath, content)

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchInFileForPattern(filePath, tempDir, 'TARGET', results, matchCount)

      expect(matchCount.count).toBeLessThanOrEqual(50)
    })

    it.each([
      {
        name: 'should provide context lines around match in middle',
        content: 'line0\nline1\nline2\nline3\nTARGET\nline5\nline6\nline7\nline8',
        pattern: 'TARGET',
        expectedLines: ['line1', 'line2', 'line3', 'TARGET', 'line5', 'line6', 'line7'],
        unexpectedLines: ['line0', 'line8'],
      },
      {
        name: 'should provide context lines around match at beginning',
        content: 'TARGET\nline2\nline3\nline4\nline5',
        pattern: 'TARGET',
        expectedLines: ['TARGET', 'line2', 'line3', 'line4'],
        unexpectedLines: ['line5'],
      },
      {
        name: 'should provide context lines around match at end',
        content: 'line1\nline2\nline3\nline4\nTARGET',
        pattern: 'TARGET',
        expectedLines: ['line2', 'line3', 'line4', 'TARGET'],
        unexpectedLines: ['line1'],
      },
      {
        name: 'should provide context lines for multiple matches',
        content: 'line1\nTARGET\nline3\nline4\nTARGET\nline6',
        pattern: 'TARGET',
        expectedLines: ['line1', 'TARGET', 'line3', 'line4', 'TARGET', 'line6'],
        unexpectedLines: [],
      },
      {
        name: 'should handle partial matches with context',
        content: 'before\npattern text here\nafter\nmore',
        pattern: 'pattern',
        expectedLines: ['before', 'pattern text here', 'after', 'more'],
        unexpectedLines: [],
      },
    ])('$name', async ({ name, content, pattern, expectedLines, unexpectedLines }) => {
      console.log(name)
      const filePath = join(tempDir, 'name.txt')
      await fs.writeFile(filePath, content)

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchInFileForPattern(filePath, tempDir, pattern, results, matchCount)

      const resultText = results.join('\n')
      console.log(matchCount.count, results, expectedLines)
      expectedLines.forEach((line) => {
        expect(resultText).toContain(line)
      })
      unexpectedLines.forEach((line) => {
        expect(resultText).not.toContain(line)
      })
    })

    it('should handle binary files gracefully', async () => {
      const filePath = join(tempDir, 'binary.bin')
      const binaryData = Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x54, 0x41, 0x52, 0x47, 0x45, 0x54])
      await fs.writeFile(filePath, binaryData)

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchInFileForPattern(filePath, tempDir, 'TARGET', results, matchCount)

      // Should not crash, might or might not find matches depending on encoding
      expect(results).toBeDefined()
    })

    it('should handle path validation failures', async () => {
      const results: string[] = []
      const matchCount = { count: 0 }
      await searchInFileForPattern('/etc/passwd', tempDir, 'root', results, matchCount)

      expect(results).toHaveLength(0)
      expect(matchCount.count).toBe(0)
    })

    it('should handle non-existent files', async () => {
      const results: string[] = []
      const matchCount = { count: 0 }
      await searchInFileForPattern(join(tempDir, 'nonexistent.txt'), tempDir, 'pattern', results, matchCount)

      expect(results).toHaveLength(0)
      expect(matchCount.count).toBe(0)
    })

    it('should handle empty files', async () => {
      const filePath = join(tempDir, 'empty.txt')
      await fs.writeFile(filePath, '')

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchInFileForPattern(filePath, tempDir, 'pattern', results, matchCount)

      expect(results).toHaveLength(0)
      expect(matchCount.count).toBe(0)
    })

    it('should stop early when match count limit reached', async () => {
      const filePath = join(tempDir, 'test.txt')
      await fs.writeFile(filePath, 'content')

      const results: string[] = []
      const matchCount = { count: 50 } // Already at limit
      await searchInFileForPattern(filePath, tempDir, 'content', results, matchCount)

      expect(matchCount.count).toBe(50) // Should not increase
    })
  })

  describe('searchRecursiveForPattern', () => {
    it('should search pattern in matching files', async () => {
      await fs.writeFile(join(tempDir, 'test.js'), 'function test() { console.log("hello"); }')
      await fs.writeFile(join(tempDir, 'test.py'), 'def test(): print("hello")')
      await fs.writeFile(join(tempDir, 'readme.txt'), 'This is documentation')

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern(tempDir, tempDir, 'hello', '*.js', [], results, matchCount)

      expect(results.join('\n')).toContain('test.js')
      expect(results.join('\n')).toContain('hello')
      expect(results.join('\n')).not.toContain('test.py')
    })

    it('should search in all files when filePattern is *', async () => {
      await fs.writeFile(join(tempDir, 'file1.js'), 'TARGET content')
      await fs.writeFile(join(tempDir, 'file2.py'), 'TARGET content')
      await fs.writeFile(join(tempDir, 'file3.txt'), 'other content')

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern(tempDir, tempDir, 'TARGET', '*', [], results, matchCount)

      expect(matchCount.count).toBe(2)
      expect(results.join('\n')).toContain('file1.js')
      expect(results.join('\n')).toContain('file2.py')
    })

    it('should respect gitignore patterns', async () => {
      const nodeModules = join(tempDir, 'node_modules')
      await fs.mkdir(nodeModules)
      await fs.writeFile(join(nodeModules, 'package.json'), '{"name": "TARGET"}')
      await fs.writeFile(join(tempDir, 'src.js'), 'const TARGET = true')

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern(tempDir, tempDir, 'TARGET', '*', ['node_modules'], results, matchCount)

      expect(results.join('\n')).toContain('src.js')
      expect(results.join('\n')).not.toContain('package.json')
    })

    it('should handle nested directories', async () => {
      const subDir = join(tempDir, 'subdir')
      await fs.mkdir(subDir)
      await fs.writeFile(join(subDir, 'nested.js'), 'TARGET found')

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern(tempDir, tempDir, 'TARGET', '*', [], results, matchCount)

      expect(results.join('\n')).toContain(normalize('subdir/nested.js'))
    })

    it('should stop when match count limit reached', async () => {
      // Create many files with matches
      for (let i = 0; i < 60; i++) {
        await fs.writeFile(join(tempDir, `file${i}.txt`), 'TARGET content')
      }

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern(tempDir, tempDir, 'TARGET', '*', [], results, matchCount)

      expect(matchCount.count).toBeLessThanOrEqual(50)
    })

    it('should handle permission errors gracefully', async () => {
      const restrictedDir = join(tempDir, 'restricted')
      await fs.mkdir(restrictedDir)
      await fs.writeFile(join(restrictedDir, 'secret.txt'), 'TARGET secret')
      await fs.chmod(restrictedDir, 0o000)

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern(tempDir, tempDir, 'TARGET', '*', [], results, matchCount)

      // Should not crash
      expect(results).toBeDefined()

      // Restore permissions for cleanup
      await fs.chmod(restrictedDir, 0o755)
    })

    it('should handle path validation failures', async () => {
      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern('/etc', tempDir, 'root', '*', [], results, matchCount)

      expect(results).toHaveLength(0)
      expect(matchCount.count).toBe(0)
    })

    it('should handle empty directories', async () => {
      const emptyDir = join(tempDir, 'empty')
      await fs.mkdir(emptyDir)

      const results: string[] = []
      const matchCount = { count: 0 }
      await searchRecursiveForPattern(emptyDir, tempDir, 'TARGET', '*', [], results, matchCount)

      expect(results).toHaveLength(0)
      expect(matchCount.count).toBe(0)
    })
  })
})
