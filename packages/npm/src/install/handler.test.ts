import { vi } from 'vitest'
import { describe, it, expect } from 'vitest'

import * as formatter from './formatter.js'
import { toolHandler } from './handler.js'
import * as execLib from '../lib/executeNpmCommand.js'

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: () => '/mock/dir',
}))

describe('toolHandler', () => {
  it('returns formatted install result for valid input', async () => {
    vi.spyOn(execLib, 'executeNpmCommand').mockResolvedValue({ stdout: 'OK', stderr: '', code: 0 })
    vi.spyOn(formatter, 'formatInstallResult').mockReturnValue({
      content: [{ type: 'text', text: 'Formatted!', _meta: {} }],
    })
    const result = await toolHandler({ packageName: 'foo', dev: true })
    expect(result.content[0].text).toBe('Formatted!')
  })

  it('returns error for missing required input', async () => {
    const result = await toolHandler({})
    expect(result.content[0].text).toContain('Invalid input')
    expect(result.content[0]._meta.stderr).toContain('Invalid input')
  })

  it('handles default value for dev', async () => {
    vi.spyOn(execLib, 'executeNpmCommand').mockResolvedValue({ stdout: 'defaultOK', stderr: '', code: 0 })
    vi.spyOn(formatter, 'formatInstallResult').mockReturnValue({
      content: [{ type: 'text', text: 'Default!', _meta: {} }],
    })
    const result = await toolHandler({ packageName: 'foo' })
    expect(result.content[0].text).toBe('Default!')
  })

  it('runs with workspace parameter and returns result', async () => {
    const spy = vi
      .spyOn(execLib, 'executeNpmCommand')
      .mockResolvedValue({ stdout: 'WS Install OK', stderr: '', code: 0 })
    vi.spyOn(formatter, 'formatInstallResult').mockReturnValue({
      content: [{ type: 'text', text: 'WS Install Formatted', _meta: {} }],
    })
    const result = await toolHandler({ packageName: 'bar', dev: false, workspace: 'packages/bar/package.json' })
    expect(result.content[0].text).toBe('WS Install Formatted')
    expect(spy).toHaveBeenCalledWith('npm', ['--workspace', 'packages/bar/package.json', 'install', 'bar'], '/mock/dir')
  })

  it('returns error if npm fails in workspace mode', async () => {
    vi.spyOn(execLib, 'executeNpmCommand').mockResolvedValue({ stdout: '', stderr: 'npm install error', code: 1 })
    vi.spyOn(formatter, 'formatInstallError').mockReturnValue({
      content: [{ type: 'text', text: 'WS Install Error', _meta: { stderr: 'npm install error' } }],
    })
    const result = await toolHandler({ packageName: 'fail', dev: false, workspace: 'packages/bar/package.json' })
    expect(result.content[0].text).toBe('WS Install Error')
    expect(result.content[0]._meta.stderr).toBe('npm install error')
  })
})
