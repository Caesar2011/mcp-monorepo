import { describe, it, expect, vi } from 'vitest'

import * as formatter from './formatter.js'
import { toolHandler } from './handler.js'
import * as helper from './helper.js'

describe('toolHandler', () => {
  it('returns formatted script list on success', async () => {
    vi.spyOn(helper, 'getScriptsOrError').mockResolvedValue({ scripts: { foo: 'bar' } })
    vi.spyOn(formatter, 'formatScriptsList').mockReturnValue('output!')
    const result = await toolHandler({})
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toBe('output!')
  })

  it('returns formatted error when helper returns error', async () => {
    vi.spyOn(helper, 'getScriptsOrError').mockResolvedValue({ error: 'fail' })
    vi.spyOn(formatter, 'formatError').mockReturnValue('ERR')
    const result = await toolHandler({})
    expect(result.content[0].text).toContain('ERR')
    expect(result.content[0]._meta.stderr).toBe('fail')
  })

  it('calls helper with workspace param and returns result', async () => {
    const getScriptsSpy = vi.spyOn(helper, 'getScriptsOrError').mockResolvedValue({ scripts: { bar: 'baz' } })
    vi.spyOn(formatter, 'formatScriptsList').mockReturnValue('workspace scripts!')
    const result = await toolHandler({ workspace: 'packages/alpha/package.json' })
    expect(getScriptsSpy).toHaveBeenCalledWith('packages/alpha/package.json')
    expect(result.content[0].text).toBe('workspace scripts!')
  })
})
