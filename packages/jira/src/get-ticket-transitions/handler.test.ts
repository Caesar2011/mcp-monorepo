import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getTicketTransitionsHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.JIRA_BASE_URL = baseUrl
  process.env.JIRA_TOKEN = token
}

describe('getTicketTransitionsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.JIRA_BASE_URL
    delete process.env.JIRA_TOKEN
  })

  it('returns formatted transitions on success', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    const mockData = {
      expand: 'transitions',
      transitions: [
        {
          id: '1',
          name: 'Done',
          to: {
            self: 'url',
            description: 'desc',
            iconUrl: 'icon',
            name: 'Done',
            id: '10003',
            statusCategory: {
              self: 'url',
              id: 3,
              key: 'done',
              colorName: 'green',
              name: 'Done',
            },
          },
          hasFields: false,
          isGlobal: false,
          isInitial: false,
        },
        {
          id: '2',
          name: 'In Progress',
          to: {
            self: 'url',
            description: 'desc',
            iconUrl: 'icon',
            name: 'In Progress',
            id: '10001',
            statusCategory: {
              self: 'url',
              id: 4,
              key: 'indeterminate',
              colorName: 'yellow',
              name: 'In Progress',
            },
          },
          hasFields: false,
          isGlobal: false,
          isInitial: false,
        },
      ],
    }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as unknown as Response)
    const params = { issueIdOrKey: 'JRA-1' }
    const result = await getTicketTransitionsHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('Done (id: 1)')
    expect(result.content[0].text).toContain('In Progress (id: 2)')
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
    const result = await getTicketTransitionsHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://jirabase', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failtrans'))
    const params = { issueIdOrKey: 'JRA-1' }
    const result = await getTicketTransitionsHandler(params)
    expect(result.content[0].text).toContain('failtrans')
  })

  it('returns error if env vars missing', async () => {
    const params = { issueIdOrKey: 'JRA-1' }
    const result = await getTicketTransitionsHandler(params)
    expect(result.content[0].text).toMatch(/JIRA_BASE_URL|JIRA_TOKEN/)
  })
})
