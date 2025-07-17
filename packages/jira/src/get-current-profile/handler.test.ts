import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getCurrentProfileHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.JIRA_BASE_URL = baseUrl
  process.env.JIRA_TOKEN = token
}

describe('getCurrentProfileHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.JIRA_BASE_URL
    delete process.env.JIRA_TOKEN
  })

  it('returns HTTP status and body on success', async () => {
    mockEnv('https://tiejira.eil.risnet.de', 'TOKEN')
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ foo: 'bar' }),
    } as unknown as Response)

    const result = await getCurrentProfileHandler()
    expect(result.content[0].text).toMatch(/^HTTP 200[\s\S]*foo[\s\S]*bar/m)
  })

  it('returns HTTP status and empty body if not JSON', async () => {
    mockEnv('https://tiejira.eil.risnet.de', 'TOKEN')
    vi.mocked(fetch).mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)

    const result = await getCurrentProfileHandler()
    expect(result.content[0].text).toContain('HTTP 204')
  })

  it('returns error text if fetch throws', async () => {
    mockEnv('https://tiejira.eil.risnet.de', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('fail'))
    const result = await getCurrentProfileHandler()
    expect(result.content[0].text).toContain('fail')
  })

  it('returns error if env vars missing', async () => {
    // Don't set env
    const result = await getCurrentProfileHandler()
    expect(result.content[0].text).toMatch(/JIRA_BASE_URL|JIRA_TOKEN/)
  })
})
