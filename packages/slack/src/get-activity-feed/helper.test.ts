import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { fetchActivityFeed } from './helper.js'

describe('fetchActivityFeed', () => {
  const OLD_ENV = { ...process.env }

  beforeEach(() => {
    process.env.XOXD_TOKEN = 'dummyd'
    process.env.XOXC_TOKEN = 'dummyc'
    process.env.TENANT_ID = 'dummytenant'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = { ...OLD_ENV }
  })

  it('should call fetch with the right headers/body/cookies', async () => {
    const mockResponse = { ok: true, items: [], response_metadata: {} }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await fetchActivityFeed()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('activity.feed'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    )
    expect(result).toEqual(mockResponse)
  })

  it('should throw error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(fetchActivityFeed()).rejects.toThrow()
  })

  it('should throw error when required environment variables are missing', async () => {
    delete process.env.XOXD_TOKEN

    await expect(fetchActivityFeed()).rejects.toThrow()
  })
})
