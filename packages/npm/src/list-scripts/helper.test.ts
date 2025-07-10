import { readFile } from 'fs/promises'
import { normalize } from 'path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getScriptsOrError } from './helper'
import * as helper from '../lib/getWorkingDirectory'

vi.mock('fs/promises')

describe('getScriptsOrError', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns scripts object if package.json is valid', async () => {
    vi.spyOn(helper, 'getWorkingDirectory').mockReturnValue('/mock/dir')
    vi.mocked(readFile).mockResolvedValue('{"scripts": {"start": "node index.js"}}')
    const result = await getScriptsOrError()
    expect('scripts' in result && result.scripts.start === 'node index.js').toBe(true)
  })

  it('returns error if package.json is missing', async () => {
    vi.spyOn(helper, 'getWorkingDirectory').mockReturnValue('/mock/dir')
    vi.mocked(readFile).mockRejectedValue(new Error('File not found'))
    const result = await getScriptsOrError()
    expect('error' in result && result.error.includes('File not found')).toBe(true)
  })

  it('resolves workspace path relative to cwd', async () => {
    vi.spyOn(helper, 'getWorkingDirectory').mockReturnValue('/root/repo')
    vi.mocked(readFile).mockResolvedValue('{"scripts": {"build": "echo build"}}')
    const result = await getScriptsOrError('packages/foo/package.json')
    // Should have called readFile with /root/repo/packages/foo/package.json
    expect(readFile).toBeCalledWith(normalize('/root/repo/packages/foo/package.json'), 'utf-8')
    expect('scripts' in result && result.scripts.build === 'echo build').toBe(true)
  })

  it('uses absolute workspace path unchanged', async () => {
    vi.spyOn(helper, 'getWorkingDirectory').mockReturnValue('/root/repo')
    vi.mocked(readFile).mockResolvedValue('{"scripts": {"abs": "true"}}')
    const result = await getScriptsOrError('/abs/path/to/pkg.json')
    expect(readFile).toBeCalledWith(normalize('/abs/path/to/pkg.json'), 'utf-8')
    expect('scripts' in result && result.scripts.abs === 'true').toBe(true)
  })
})
