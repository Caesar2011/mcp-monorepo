import { describe, it, expect, vi, beforeEach } from 'vitest'

import { listSpacesHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.CONFLUENCE_BASE_URL = baseUrl
  process.env.CONFLUENCE_TOKEN = token
}

describe('listSpacesHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CONFLUENCE_BASE_URL
    delete process.env.CONFLUENCE_TOKEN
  })

  it('returns formatted list of spaces on success', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    const mockData = { results: [{ id: '1', key: 'DOCS' }], start: 0, limit: 50, size: 1 }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as unknown as Response)
    const params = { limit: 50, start: 0 }
    const result = await listSpacesHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('DOCS')
  })

  it('handles no body (not JSON)', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    vi.mocked(fetch).mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)
    const params = {}
    const result = await listSpacesHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('faillistspaces'))
    const params = {}
    const result = await listSpacesHandler(params)
    expect(result.content[0].text).toContain('faillistspaces')
  })

  it('returns error if env vars missing', async () => {
    const params = {}
    const result = await listSpacesHandler(params)
    expect(result.content[0].text).toMatch(/CONFLUENCE_BASE_URL|CONFLUENCE_TOKEN/)
  })
})
