// Mock getWorkingDirectory before importing the code under test
import { vi } from 'vitest'
import { describe, it, expect } from 'vitest'

import * as formatter from './formatter.js'
import { toolHandler } from './handler.js'
import * as execLib from '../lib/executeNpmCommand.js'

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: () => '/mock/dir',
}))

describe('toolHandler', () => {
  it('returns formatted run result for valid input', async () => {
    vi.spyOn(execLib, 'executeNpmCommand').mockResolvedValue({ stdout: 'OK', stderr: '', code: 0 })
    vi.spyOn(formatter, 'formatRunResult').mockReturnValue({
      content: [{ type: 'text', text: 'Formatted', _meta: {} }],
    })
    const result = await toolHandler({ scriptName: 'test' })
    expect(result.content[0].text).toBe('Formatted')
  })

  it('returns error for invalid input', async () => {
    const result = await toolHandler({})
    expect(result.content[0].text).toContain('Invalid input')
    expect(result.content[0]._meta.stderr).toContain('Invalid input')
  })

  it('runs with workspace parameter and returns result', async () => {
    const spy = vi.spyOn(execLib, 'executeNpmCommand').mockResolvedValue({ stdout: 'WS OK', stderr: '', code: 0 })
    vi.spyOn(formatter, 'formatRunResult').mockReturnValue({
      content: [{ type: 'text', text: 'WS Formatted', _meta: {} }],
    })
    const result = await toolHandler({ scriptName: 'build', workspace: 'packages/foo/package.json' })
    expect(result.content[0].text).toBe('WS Formatted')
    expect(spy).toHaveBeenCalledWith('npm', ['--workspace', 'packages/foo/package.json', 'run', 'build'], '/mock/dir')
  })

  it('returns error if npm fails in workspace mode', async () => {
    vi.spyOn(execLib, 'executeNpmCommand').mockResolvedValue({ stdout: '', stderr: 'npm error', code: 1 })
    vi.spyOn(formatter, 'formatRunError').mockReturnValue({
      content: [{ type: 'text', text: 'WS Error', _meta: { stderr: 'npm error' } }],
    })
    const result = await toolHandler({ scriptName: 'fail', workspace: 'packages/foo/package.json' })
    expect(result.content[0].text).toBe('WS Error')
    expect(result.content[0]._meta.stderr).toBe('npm error')
  })
})
