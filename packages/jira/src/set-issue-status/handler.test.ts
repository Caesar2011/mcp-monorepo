import { describe, it, expect, vi, beforeEach } from 'vitest'

import { setIssueStatusHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.JIRA_BASE_URL = baseUrl
  process.env.JIRA_TOKEN = token
}

describe('setIssueStatusHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.JIRA_BASE_URL
    delete process.env.JIRA_TOKEN
  })

  it('transitions issue with transitionId', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    // Only POST to /transitions
    vi.mocked(fetch).mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => ({}),
    } as unknown as Response)
    const params = { issueIdOrKey: 'JRA-1', transitionId: '11' }
    const result = await setIssueStatusHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('Issue transitioned')
  })

  it('transitions issue with status name, finds transitionId', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    // First call: GET transitions
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          transitions: [{ id: '22', name: 'Done', to: { name: 'Done', id: '33' } }],
        }),
      } as unknown as Response)
      // Second call: POST transition
      .mockResolvedValueOnce({
        status: 204,
        ok: true,
        json: async () => ({}),
      } as unknown as Response)
    const params = { issueIdOrKey: 'JRA-2', status: 'Done' }
    const result = await setIssueStatusHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('Done')
  })

  it('fails on invalid status', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ transitions: [] }),
    } as unknown as Response)
    const params = { issueIdOrKey: 'JRA-2', status: 'Nonexistent' }
    const result = await setIssueStatusHandler(params)
    expect(result.content[0].text).toContain('No transition found')
  })

  it('fails if neither status nor transitionId provided', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    const params = { issueIdOrKey: 'JRA-3' }
    const result = await setIssueStatusHandler(params)
    expect(result.content[0].text).toContain('Either transitionId or status must be provided')
  })

  it('handles fetch error', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failstatus'))
    const params = { issueIdOrKey: 'JRA-1', transitionId: '11' }
    const result = await setIssueStatusHandler(params)
    expect(result.content[0].text).toContain('failstatus')
  })

  it('returns error if env vars missing', async () => {
    const params = { issueIdOrKey: 'JRA-1', transitionId: '11' }
    const result = await setIssueStatusHandler(params)
    expect(result.content[0].text).toMatch(/JIRA_BASE_URL|JIRA_TOKEN/)
  })
})
