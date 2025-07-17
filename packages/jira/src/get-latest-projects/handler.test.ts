import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getLatestProjectsHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.JIRA_BASE_URL = baseUrl
  process.env.JIRA_TOKEN = token
}

describe('getLatestProjectsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.JIRA_BASE_URL
    delete process.env.JIRA_TOKEN
  })

  it('returns formatted projects on success', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    const mockData = {
      isLast: true,
      maxResults: 5,
      startAt: 0,
      total: 2,
      values: [
        { key: 'PRJ1', id: '1', name: 'Project One' },
        { key: 'PRJ2', id: '2', name: 'Project Two' },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as any)
    const params = { maxResults: 5 }
    const result = await getLatestProjectsHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('PRJ1')
    expect(result.content[0].text).toContain('Project One')
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
    const params = { maxResults: 2 }
    const result = await getLatestProjectsHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failprojects'))
    const params = { maxResults: 2 }
    const result = await getLatestProjectsHandler(params)
    expect(result.content[0].text).toContain('failprojects')
  })

  it('returns error if env vars missing', async () => {
    const params = { maxResults: 2 }
    const result = await getLatestProjectsHandler(params)
    expect(result.content[0].text).toMatch(/JIRA_BASE_URL|JIRA_TOKEN/)
  })
})
