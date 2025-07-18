import { describe, it, expect, vi, beforeEach } from 'vitest'

import { listSpacePagesHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.CONFLUENCE_BASE_URL = baseUrl
  process.env.CONFLUENCE_TOKEN = token
}

describe('listSpacePagesHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CONFLUENCE_BASE_URL
    delete process.env.CONFLUENCE_TOKEN
  })

  it('returns formatted list of pages on success', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    const mockData = { results: [{ id: '1', title: 'TestPage' }], start: 0, limit: 50, size: 1 }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as unknown as Response)
    const params = { spaceKey: 'DOCS', limit: 50, start: 0 }
    const result = await listSpacePagesHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('TestPage')
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
    const params = { spaceKey: 'DOCS' }
    const result = await listSpacePagesHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('faillistpages'))
    const params = { spaceKey: 'DOCS' }
    const result = await listSpacePagesHandler(params)
    expect(result.content[0].text).toContain('faillistpages')
  })

  it('returns error if env vars missing', async () => {
    const params = { spaceKey: 'DOCS' }
    const result = await listSpacePagesHandler(params)
    expect(result.content[0].text).toMatch(/CONFLUENCE_BASE_URL|CONFLUENCE_TOKEN/)
  })
})
