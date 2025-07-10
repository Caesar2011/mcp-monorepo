import { mkdtemp, mkdir, writeFile, rm, chmod } from 'fs/promises'
import { symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, basename } from 'path'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { buildDirectoryTree } from './helper.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory'
import { isIgnored, resetGitignoreCache } from '../lib/gitignore.js'

import type { TreeToolParams } from './types.js'

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))
vi.mock('../lib/gitignore.js', () => ({
  isIgnored: vi.fn(),
  resetGitignoreCache: vi.fn(),
}))

const mockGetWorkingDirectory = vi.mocked(getWorkingDirectory)
const mockIsIgnored = vi.mocked(isIgnored)

let tempDir: string

describe('buildDirectoryTree', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'file-browser-tree-'))
    mockGetWorkingDirectory.mockReturnValue(tempDir)
    mockIsIgnored.mockImplementation(async () => false)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
    resetGitignoreCache()
  })

  it('should build tree for simple directory structure', async () => {
    await writeFile(join(tempDir, 'file1.txt'), 'abc')
    await mkdir(join(tempDir, 'subdir'))
    await writeFile(join(tempDir, 'subdir', 'file2.txt'), 'def')
    const params: TreeToolParams = { path: '.', depth: 2 }
    const result = await buildDirectoryTree(params)

    expect(result.tree.name).toBe(basename(tempDir))
    expect(result.tree.type).toBe('DIR')
    expect(result.tree.children).toHaveLength(2)
    expect(result.totalFiles).toBe(2)
    expect(result.totalDirectories).toBe(2) // root + subdir
    expect(result.truncated).toBe(false)
  })

  it('should respect depth limitation', async () => {
    await mkdir(join(tempDir, 'level1'))
    await writeFile(join(tempDir, 'level1', 'file.txt'), 'content')
    const params: TreeToolParams = { path: '.', depth: 1 }
    const result = await buildDirectoryTree(params)

    expect(result.maxDepthReached).toBe(1)
    expect(result.tree.children[0].children).toStrictEqual([])
  })

  it('should enforce maximum depth of 5', async () => {
    let last = tempDir
    // Create dirs up to depth 10
    for (let i = 1; i <= 10; ++i) {
      const next = join(last, `d${i}`)
      await mkdir(next)
      last = next
    }
    const params: TreeToolParams = { path: '.', depth: 10 }
    const result = await buildDirectoryTree(params)
    expect(result.maxDepthReached).toBeLessThanOrEqual(5)
  })

  it('should respect .gitignore rules', async () => {
    await writeFile(join(tempDir, 'regular-file.txt'), 'foo')
    await writeFile(join(tempDir, 'ignored-file.log'), 'bar')
    mockIsIgnored.mockImplementation(async (path) => path.endsWith('ignored-file.log'))

    const params: TreeToolParams = { path: '.' }
    const result = await buildDirectoryTree(params)
    expect(result.tree.children).toHaveLength(1)
    expect(result.tree.children[0].name).toBe('regular-file.txt')
    expect(result.totalFiles).toBe(1)
  })

  it(
    'should limit total items to 200',
    async () => {
      for (let i = 0; i < 210; i++) {
        await writeFile(join(tempDir, `file${i}.txt`), `data-${i}`)
      }
      const params: TreeToolParams = { path: '.' }
      const result = await buildDirectoryTree(params)

      expect(result.totalFiles + result.totalDirectories).toBeLessThanOrEqual(200)
      expect(result.truncated).toBe(true)
    },
    { timeout: 20000 },
  )

  it('should handle BFS correctly', async () => {
    await mkdir(join(tempDir, 'dir1'))
    await mkdir(join(tempDir, 'dir2'))
    await writeFile(join(tempDir, 'dir1', 'file1.txt'), '1')
    await writeFile(join(tempDir, 'dir1', 'file2.txt'), '2')
    await writeFile(join(tempDir, 'dir2', 'file1.txt'), '3')
    await writeFile(join(tempDir, 'dir2', 'file2.txt'), '4')

    const params: TreeToolParams = { path: '.', depth: 3 }
    const result = await buildDirectoryTree(params)

    expect(result.tree.children).toHaveLength(2)
    for (const dirNode of result.tree.children) {
      expect(['dir1', 'dir2']).toContain(dirNode.name)
      expect(dirNode.children).toHaveLength(2)
    }
    expect(result.totalFiles).toBe(4)
    expect(result.totalDirectories).toBe(3) // root + dir1 + dir2
  })

  it('should throw error for path outside working directory', async () => {
    mockGetWorkingDirectory.mockReturnValue(tempDir)
    const outside = join(tempDir, '..')
    const params: TreeToolParams = { path: outside }
    await expect(buildDirectoryTree(params)).rejects.toThrow(
      'Access forbidden: Directory outside the working directory.',
    )
  })

  it('should throw error if root path is ignored', async () => {
    mockIsIgnored.mockResolvedValueOnce(true) // root is ignored
    const params: TreeToolParams = { path: '.' }
    await expect(buildDirectoryTree(params)).rejects.toThrow(
      'Access forbidden: Target directory is ignored by .gitignore.',
    )
  })

  it('should throw error if target is not a directory', async () => {
    await writeFile(join(tempDir, 'afile.txt'), 'fff')
    const params: TreeToolParams = { path: 'afile.txt' }
    await expect(buildDirectoryTree(params)).rejects.toThrow('Target path is not a directory.')
  })

  it('should handle permission errors gracefully', async () => {
    await mkdir(join(tempDir, 'accessible'))
    await mkdir(join(tempDir, 'restricted'))
    await writeFile(join(tempDir, 'accessible', 'file.txt'), 'ok')
    await writeFile(join(tempDir, 'restricted', 'nope.txt'), 'nope')

    // Make restricted unreadable
    await chmod(join(tempDir, 'restricted'), 0)

    const params: TreeToolParams = { path: '.', depth: 2 }
    const result = await buildDirectoryTree(params)

    // Should list both directories; restricted children will be skipped
    expect(result.tree.children).toHaveLength(2)
    expect(result.totalDirectories).toBe(3)

    // Restore permission so cleanup works
    await chmod(join(tempDir, 'restricted'), 0o700)
  })

  it('should skip non-file and non-directory entries', async () => {
    await writeFile(join(tempDir, 'regular-file.txt'), 'file')
    await mkdir(join(tempDir, 'regular-dir'))
    await writeFile(join(tempDir, 'regular-dir', 'dummy.txt'), 'x')

    // Create a symlink if allowed
    let canSymlink = true
    try {
      await symlink(join(tempDir, 'regular-file.txt'), join(tempDir, 'symlink'))
    } catch {
      canSymlink = false
    }

    const params: TreeToolParams = { path: '.' }
    const result = await buildDirectoryTree(params)

    expect(result.tree.children.some((n) => n.name === 'regular-file.txt')).toBe(true)
    expect(result.tree.children.some((n) => n.name === 'regular-dir')).toBe(true)
    if (canSymlink) expect(result.tree.children.some((n) => n.name === 'symlink')).toBe(false)
    expect(result.totalFiles).toBe(2)
    expect(result.totalDirectories).toBe(2)
  })

  it('should use default depth of 3', async () => {
    const params: TreeToolParams = { path: '.' } // no depth specified
    const result = await buildDirectoryTree(params)

    expect(result).toBeDefined()
    expect(result.tree.name).toBe(basename(tempDir))
    expect(result.tree.type).toBe('DIR')
  })

  it('should handle subdirectory path correctly', async () => {
    await mkdir(join(tempDir, 'subdir'))
    await writeFile(join(tempDir, 'subdir', 'file.txt'), 'xx')
    const params: TreeToolParams = { path: 'subdir' }
    const result = await buildDirectoryTree(params)

    expect(result.tree.name).toBe('subdir')
    expect(result.tree.path).toBe('subdir')
    expect(result.tree.children).toHaveLength(1)
    expect(result.tree.children?.[0].name).toBe('file.txt')
  })
})
