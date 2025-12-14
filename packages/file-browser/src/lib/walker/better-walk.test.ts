import { mkdtemp, rm, mkdir, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { platform } from 'node:os'
import { join } from 'node:path'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

import { traverseDirectoryBFS } from './better-walker.js'

async function collectResults(generator: ReturnType<typeof traverseDirectoryBFS>): Promise<string[]> {
  const results: string[] = []
  for await (const item of generator) {
    results.push(item.relPath)
  }
  return results
}

describe('Better Walker - No ignore files', () => {
  let tempDir: string

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'better-walker-test-no-ignore-'))

    await mkdir(join(tempDir, 'folder1'))
    await mkdir(join(tempDir, 'folder2'))
    await mkdir(join(tempDir, 'folder1', 'subfolder'))
    await writeFile(join(tempDir, 'file1.txt'), 'content1')
    await writeFile(join(tempDir, 'file2.js'), 'console.log("test")')
    await writeFile(join(tempDir, 'folder1', 'file2.txt'), 'content2')
    await writeFile(join(tempDir, 'folder2', 'file3.txt'), 'content3')
    await writeFile(join(tempDir, 'folder1', 'subfolder', 'deep.txt'), 'deep content')

    await mkdir(join(tempDir, 'empty-folder'))

    await writeFile(join(tempDir, '.dotfile'), 'hidden content')
    await writeFile(join(tempDir, 'file with spaces.txt'), 'spaces')
    await writeFile(join(tempDir, 'file-with-dashes.log'), 'dashes')

    if (platform() !== 'win32') {
      try {
        await symlink(join(tempDir, 'folder1'), join(tempDir, 'symlink-folder'))
        await symlink(join(tempDir, 'file1.txt'), join(tempDir, 'symlink-file'))
      } catch {
        // Ignore symlink creation errors in some environments
      }
    }
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should traverse all files without ignore files', async () => {
    const expectedIncludedFiles = [
      'file1.txt',
      'file2.js',
      'folder1/file2.txt',
      'folder2/file3.txt',
      'folder1/subfolder/deep.txt',
      '.dotfile',
      'file with spaces.txt',
      'file-with-dashes.log',
    ]

    if (platform() !== 'win32') {
      expectedIncludedFiles.push('symlink-folder', 'symlink-file')
    }

    const result = await collectResults(traverseDirectoryBFS({ absoluteFolderPath: tempDir, followSymLinks: false }))
    expect(result.sort()).toEqual(expectedIncludedFiles.sort())
  })

  it('should include empty directories when traversing', async () => {
    const expectedIncludedFiles = [
      'file1.txt',
      'file2.js',
      'folder1/file2.txt',
      'folder2/file3.txt',
      'folder1/subfolder/deep.txt',
      '.dotfile',
      'file with spaces.txt',
      'file-with-dashes.log',
      'empty-folder',
    ]

    if (platform() !== 'win32') {
      expectedIncludedFiles.push('symlink-folder', 'symlink-file')
    }

    const result = await collectResults(traverseDirectoryBFS({ absoluteFolderPath: tempDir, includeEmptyDir: true }))
    expect(result.sort()).toEqual(expectedIncludedFiles.sort())
  })

  it('should not include empty directories by default', async () => {
    const result = await collectResults(traverseDirectoryBFS({ absoluteFolderPath: tempDir }))
    expect(result).not.toContain('empty-folder')
  })

  it('should handle symbolic links based on followSymLinks option', async () => {
    if (platform() !== 'win32') {
      const resultFollow = await collectResults(
        traverseDirectoryBFS({ absoluteFolderPath: tempDir, followSymLinks: true }),
      )
      const resultNoFollow = await collectResults(
        traverseDirectoryBFS({ absoluteFolderPath: tempDir, followSymLinks: false }),
      )

      expect(resultFollow).toContain('symlink-folder/file2.txt')
      expect(resultNoFollow).not.toContain('symlink-folder/file2.txt')
      expect(resultNoFollow.length).toBeGreaterThan(0)
    }
  })

  it('should handle non-existent path', async () => {
    await expect(
      collectResults(traverseDirectoryBFS({ absoluteFolderPath: join(tempDir, 'non-existent') })),
    ).rejects.toThrow()
  })

  it('should handle file as path instead of directory', async () => {
    await expect(
      collectResults(traverseDirectoryBFS({ absoluteFolderPath: join(tempDir, 'file1.txt') })),
    ).rejects.toThrow()
  })
})

describe('Better Walker - Root ignore file only', () => {
  let tempDir: string

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'better-walker-test-root-ignore-'))

    await mkdir(join(tempDir, 'src'))
    await mkdir(join(tempDir, 'tests'))
    await mkdir(join(tempDir, 'node_modules'))
    await mkdir(join(tempDir, 'dist'))
    await mkdir(join(tempDir, 'src', 'components'))

    await writeFile(join(tempDir, 'package.json'), '{}')
    await writeFile(join(tempDir, 'README.md'), 'readme')
    await writeFile(join(tempDir, 'src', 'index.js'), 'main')
    await writeFile(join(tempDir, 'src', 'components', 'Button.js'), 'button')
    await writeFile(join(tempDir, 'tests', 'test.js'), 'test')
    await writeFile(join(tempDir, 'node_modules', 'package.json'), 'deps')
    await writeFile(join(tempDir, 'dist', 'bundle.js'), 'bundle')
    await writeFile(join(tempDir, '.env'), 'secret=123')
    await writeFile(join(tempDir, '.env.local'), 'local=456')

    await writeFile(
      join(tempDir, '.gitignore'),
      ['node_modules', 'dist', '.env*', '*.log', '# This is a comment', '', '!.env.example'].join('\n'),
    )

    await writeFile(join(tempDir, 'debug.log'), 'debug info')
    await writeFile(join(tempDir, 'error.log'), 'error info')
    await writeFile(join(tempDir, '.env.example'), 'example=value')
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should apply root ignore rules', async () => {
    const expectedIncludedFiles = [
      '.gitignore',
      '.env.example',
      'package.json',
      'README.md',
      'src/components/Button.js',
      'src/index.js',
      'tests/test.js',
    ]

    const result = await collectResults(traverseDirectoryBFS({ absoluteFolderPath: tempDir }))
    expect(result.sort()).toEqual(expectedIncludedFiles.sort())
  })
})

describe('Better Walker - Root and nested ignore files', () => {
  let tempDir: string

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'better-walker-test-nested-ignore-'))

    await mkdir(join(tempDir, 'src'))
    await mkdir(join(tempDir, 'src', 'utils'))
    await mkdir(join(tempDir, 'src', 'components'))
    await mkdir(join(tempDir, 'tests'))
    await mkdir(join(tempDir, 'tests', 'unit'))
    await mkdir(join(tempDir, 'tests', 'integration'))
    await mkdir(join(tempDir, 'docs'))
    await mkdir(join(tempDir, 'config'))

    await writeFile(join(tempDir, 'package.json'), '{}')
    await writeFile(join(tempDir, 'src', 'index.js'), 'main')
    await writeFile(join(tempDir, 'src', 'config.js'), 'config')
    await writeFile(join(tempDir, 'src', 'utils', 'helper.js'), 'helper')
    await writeFile(join(tempDir, 'src', 'utils', 'debug.js'), 'debug')
    await writeFile(join(tempDir, 'src', 'components', 'Button.js'), 'button')
    await writeFile(join(tempDir, 'src', 'components', 'Modal.js'), 'modal')
    await writeFile(join(tempDir, 'tests', 'setup.js'), 'setup')
    await writeFile(join(tempDir, 'tests', 'unit', 'helper.test.js'), 'unit test')
    await writeFile(join(tempDir, 'tests', 'unit', 'debug.test.js'), 'debug test')
    await writeFile(join(tempDir, 'tests', 'integration', 'api.test.js'), 'integration test')
    await writeFile(join(tempDir, 'docs', 'README.md'), 'docs')
    await writeFile(join(tempDir, 'docs', 'api.md'), 'api docs')
    await writeFile(join(tempDir, 'config', 'dev.json'), 'dev config')
    await writeFile(join(tempDir, 'config', 'prod.json'), 'prod config')

    await writeFile(join(tempDir, '.gitignore'), ['*.log', 'tmp', 'config/prod.json'].join('\n'))
    await writeFile(join(tempDir, 'src', '.gitignore'), ['config.js', 'utils/debug.js'].join('\n'))
    await writeFile(join(tempDir, 'tests', '.gitignore'), ['*.test.js', '!unit/*.test.js'].join('\n'))
    await writeFile(join(tempDir, 'docs', '.gitignore'), ['api.md'].join('\n'))

    await writeFile(join(tempDir, 'error.log'), 'error')
    await writeFile(join(tempDir, 'src', 'debug.log'), 'src debug')
    await mkdir(join(tempDir, 'tmp'))
    await writeFile(join(tempDir, 'tmp', 'cache.txt'), 'cache')
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should apply nested ignore rules correctly', async () => {
    const expectedIncludedFiles = [
      '.gitignore',
      'config/dev.json',
      'docs/.gitignore',
      'docs/README.md',
      'package.json',
      'src/.gitignore',
      'src/components/Button.js',
      'src/components/Modal.js',
      'src/index.js',
      'src/utils/helper.js',
      'tests/.gitignore',
      'tests/setup.js',
      'tests/unit/debug.test.js',
      'tests/unit/helper.test.js',
    ]

    const result = await collectResults(traverseDirectoryBFS({ absoluteFolderPath: tempDir }))
    expect(result.sort()).toEqual(expectedIncludedFiles.sort())
  })
})
