import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getIssueHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.JIRA_BASE_URL = baseUrl
  process.env.JIRA_TOKEN = token
}

describe('getIssueHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.JIRA_BASE_URL
    delete process.env.JIRA_TOKEN
  })

  it('returns formatted issue on success', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    const mockData = {
      id: '1',
      key: 'JRA-1',
      fields: {
        summary: 'Test issue',
        status: { name: 'Open' },
        assignee: { displayName: 'John Doe' },
        description: 'A test issue',
      },
    }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as unknown as Response)
    const params = { issueIdOrKey: 'JRA-1' }
    const result = await getIssueHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('JRA-1')
    expect(result.content[0].text).toContain('Test issue')
    expect(result.content[0].text).toContain('John Doe')
    expect(result.content[0].text).toContain('A test issue')
  })

  it('handles no body (not JSON)', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)
    const params = { issueIdOrKey: 'JRA-1' }
    const result = await getIssueHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failissue'))
    const params = { issueIdOrKey: 'JRA-1' }
    const result = await getIssueHandler(params)
    expect(result.content[0].text).toContain('failissue')
  })

  it('returns error if env vars missing', async () => {
    const params = { issueIdOrKey: 'JRA-1' }
    const result = await getIssueHandler(params)
    expect(result.content[0].text).toMatch(/JIRA_BASE_URL|JIRA_TOKEN/)
  })
})
