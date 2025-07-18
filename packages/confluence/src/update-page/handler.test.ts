import { describe, it, expect, vi, beforeEach } from 'vitest'

import { updatePageHandler } from './handler.js'

vi.stubGlobal('fetch', vi.fn())

const mockEnv = (baseUrl: string, token: string) => {
  process.env.CONFLUENCE_BASE_URL = baseUrl
  process.env.CONFLUENCE_TOKEN = token
}

describe('updatePageHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.CONFLUENCE_BASE_URL
    delete process.env.CONFLUENCE_TOKEN
  })

  it('returns formatted updated page on success', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    const mockData = { id: '1', type: 'page', status: 'current', title: 'Updated Page' }
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockData,
    } as unknown as Response)
    const params = { pageId: '1', newTitle: 'Updated Page', newContent: '<p>Hi</p>', currentVersionNumber: 2 }
    const result = await updatePageHandler(params)
    expect(result.content[0].text).toContain('HTTP 200')
    expect(result.content[0].text).toContain('Updated Page')
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
    const params = { pageId: '1', newTitle: 'NoBody', newContent: '...', currentVersionNumber: 3 }
    const result = await updatePageHandler(params)
    expect(result.content[0].text).toContain('HTTP 204')
    expect(result.content[0].text).toContain('no response body')
  })

  it('handles error', async () => {
    mockEnv('https://confluencehost', 'TOKEN')
    vi.mocked(fetch).mockRejectedValue(new Error('failupdate'))
    const params = { pageId: '1', newTitle: 'Err', newContent: '...', currentVersionNumber: 2 }
    const result = await updatePageHandler(params)
    expect(result.content[0].text).toContain('failupdate')
  })

  it('returns error if env vars missing', async () => {
    const params = { pageId: '1', newTitle: 'Err', newContent: '...', currentVersionNumber: 2 }
    const result = await updatePageHandler(params)
    expect(result.content[0].text).toMatch(/CONFLUENCE_BASE_URL|CONFLUENCE_TOKEN/)
  })
})
