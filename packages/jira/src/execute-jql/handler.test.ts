import { describe, it, expect, vi, beforeEach } from 'vitest'

import { executeJqlHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.JIRA_BASE_URL = baseUrl
  process.env.JIRA_TOKEN = token
}

describe('executeJqlHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.JIRA_BASE_URL
    delete process.env.JIRA_TOKEN
  })

  it('returns formatted issues on success', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    const mockData = {
      expand: '',
      startAt: 0,
      maxResults: 1,
      total: 1,
      issues: [{ key: 'JRA-1', id: '1', fields: { summary: 'Test issue', status: { name: 'Open' } } }],
    }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as any)
    const params = { jql: 'project=JRA', maxResults: 1 }
    const result = await executeJqlHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('JRA-1')
    expect(result.content[0].text).toContain('Test issue')
  })

  it('handles no body (not JSON)', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => {
        throw new Error('not json')
      },
    } as any)
    const params = { jql: 'project=JRA' }
    const result = await executeJqlHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failjql'))
    const params = { jql: 'project=JRA' }
    const result = await executeJqlHandler(params)
    expect(result.content[0].text).toContain('failjql')
  })

  it('returns error if env vars missing', async () => {
    const params = { jql: 'project=JRA' }
    const result = await executeJqlHandler(params)
    expect(result.content[0].text).toMatch(/JIRA_BASE_URL|JIRA_TOKEN/)
  })
})
