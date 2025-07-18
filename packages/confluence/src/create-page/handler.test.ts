import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createPageHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.CONFLUENCE_BASE_URL = baseUrl
  process.env.CONFLUENCE_TOKEN = token
}

describe('createPageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CONFLUENCE_BASE_URL
    delete process.env.CONFLUENCE_TOKEN
  })

  it('returns formatted created page on success', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    const mockData = { id: '1', type: 'page', status: 'current', title: 'Created Page' }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as unknown as Response)
    const params = { spaceKey: 'DOCS', title: 'Created Page', content: '<p>Hi</p>' }
    const result = await createPageHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('Created Page')
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
    const params = { spaceKey: 'DOCS', title: 'NoBody', content: '...' }
    const result = await createPageHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failcreate'))
    const params = { spaceKey: 'DOCS', title: 'Err', content: '...' }
    const result = await createPageHandler(params)
    expect(result.content[0].text).toContain('failcreate')
  })

  it('returns error if env vars missing', async () => {
    const params = { spaceKey: 'DOCS', title: 'Err', content: '...' }
    const result = await createPageHandler(params)
    expect(result.content[0].text).toMatch(/CONFLUENCE_BASE_URL|CONFLUENCE_TOKEN/)
  })
})
