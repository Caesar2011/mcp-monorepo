import { existsSync } from 'fs'
import { join, resolve } from 'path'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { findClosestPackageJsonDir } from './getDatabase.js'

vi.mock('fs')

const mockedExistsSync = vi.mocked(existsSync, true)

describe('findClosestPackageJsonDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('returns the closest parent directory with package.json', () => {
    // Simulate: /a/b/c (start) -> /a/b (has package.json)
    const startDir = '/a/b/c'
    mockedExistsSync.mockImplementation((file) => {
      return resolve(file.toString()) === resolve(join('/a/b', 'package.json'))
    })
    const result = findClosestPackageJsonDir(startDir)
    expect(result).toBe(resolve('/a/b'))
  })

  it('returns undefined if no package.json is found up the tree', () => {
    // Simulate: /a/b/c (start) -> none found
    const startDir = '/a/b/c'
    mockedExistsSync.mockReturnValue(false)
    const result = findClosestPackageJsonDir(startDir)
    expect(result).toBeUndefined()
  })

  it('returns startDir itself if it has package.json', () => {
    const startDir = '/my/project'
    mockedExistsSync.mockImplementation((file) => {
      return resolve(file.toString()) === resolve(join(startDir, 'package.json'))
    })
    const result = findClosestPackageJsonDir(startDir)
    expect(result).toBe(resolve(startDir))
  })

  it('stops at root and returns undefined if not found', () => {
    // Simulate: / (root, no package.json)
    const startDir = '/'
    mockedExistsSync.mockReturnValue(false)
    const result = findClosestPackageJsonDir(startDir)
    expect(result).toBeUndefined()
  })
})
