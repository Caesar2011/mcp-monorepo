import { describe, it, expect, vi, beforeEach } from 'vitest'

import { openPageHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.CONFLUENCE_BASE_URL = baseUrl
  process.env.CONFLUENCE_TOKEN = token
}

describe('openPageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CONFLUENCE_BASE_URL
    delete process.env.CONFLUENCE_TOKEN
  })

  it('returns formatted page content on success', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    const mockData = { id: '123', type: 'page', status: 'current', title: 'Test Page' }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as unknown as Response)
    const params = { pageId: '123' }
    const result = await openPageHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('Test Page')
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
    const params = { pageId: '456' }
    const result = await openPageHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failopen'))
    const params = { pageId: '789' }
    const result = await openPageHandler(params)
    expect(result.content[0].text).toContain('failopen')
  })

  it('returns error if env vars missing', async () => {
    const params = { pageId: '123' }
    const result = await openPageHandler(params)
    expect(result.content[0].text).toMatch(/CONFLUENCE_BASE_URL|CONFLUENCE_TOKEN/)
  })
})
