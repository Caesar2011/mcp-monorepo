import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { paginate, runSlackGet, runSlackPost } from './slack-client.js'

vi.mock('./env.js', () => ({
  getSlackEnv: vi.fn(() => ({
    XOXD_TOKEN: 'test-xoxd-token',
    XOXC_TOKEN: 'test-xoxc-token',
    TENANT_ID: 'T123456789',
  })),
}))

vi.mock('./message-fetch.js', () => ({
  fetchMessageByTs: vi.fn(),
}))

// Mock global fetch
global.fetch = vi.fn()

describe('slack-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('paginate', () => {
    it('should paginate through results with cursor', async () => {
      const mockCallback = vi
        .fn()
        .mockResolvedValueOnce({
          data: ['item1', 'item2'],
          response_metadata: { next_cursor: 'cursor1' },
        })
        .mockResolvedValueOnce({
          data: ['item3', 'item4'],
          response_metadata: { next_cursor: 'cursor2' },
        })
        .mockResolvedValueOnce({
          data: ['item5'],
          response_metadata: undefined,
        })

      const results = []
      for await (const result of paginate(mockCallback, { limit: 10 })) {
        results.push(result)
      }

      expect(mockCallback).toHaveBeenCalledTimes(3)
      expect(mockCallback).toHaveBeenNthCalledWith(1, { limit: 10 })
      expect(mockCallback).toHaveBeenNthCalledWith(2, { limit: 10, cursor: 'cursor1' })
      expect(mockCallback).toHaveBeenNthCalledWith(3, { limit: 10, cursor: 'cursor2' })

      expect(results).toEqual([{ data: ['item1', 'item2'] }, { data: ['item3', 'item4'] }, { data: ['item5'] }])
    })

    it('should stop pagination when no cursor is returned', async () => {
      const mockCallback = vi.fn().mockResolvedValueOnce({
        data: ['item1'],
        response_metadata: undefined,
      })

      const results = []
      for await (const result of paginate(mockCallback, { limit: 10 })) {
        results.push(result)
      }

      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(results).toEqual([{ data: ['item1'] }])
    })

    it('should stop pagination after 3 iterations to prevent infinite loops', async () => {
      const mockCallback = vi.fn().mockResolvedValue({
        data: ['item'],
        response_metadata: { next_cursor: 'always-cursor' },
      })

      const results = []
      for await (const result of paginate(mockCallback, { limit: 10 })) {
        results.push(result)
      }

      expect(mockCallback).toHaveBeenCalledTimes(5)
      expect(results).toHaveLength(5)
    })

    it('should handle callback errors', async () => {
      const mockCallback = vi.fn().mockRejectedValue(new Error('API Error'))

      const generator = paginate(mockCallback, { limit: 10 })

      await expect(generator.next()).rejects.toThrow('API Error')
    })
  })

  describe('runSlackGet', () => {
    it('should make GET request with correct headers and URL', async () => {
      const mockResponse = { ok: true, data: 'test' }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const result = await runSlackGet('test.method')

      expect(fetch).toHaveBeenCalledWith('https://netlight.slack.com/api/test.method?slack_route=T123456789', {
        credentials: 'include',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
          Accept: '*/*',
          'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
          Cookie: 'd=test-xoxd-token',
          Authorization: 'Bearer test-xoxc-token',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response)

      await expect(runSlackGet('test.method')).rejects.toThrow('Failed to fetch test.method')
    })

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      await expect(runSlackGet('test.method')).rejects.toThrow('Network error')
    })
  })

  describe('runSlackPost', () => {
    it('should make POST request with correct headers, URL, and body', async () => {
      const mockResponse = { ok: true, data: 'test' }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const body = new URLSearchParams({ param1: 'value1', param2: 'value2' })
      const result = await runSlackPost('test.method', body)

      expect(fetch).toHaveBeenCalledWith('https://netlight.slack.com/api/test.method?slack_route=T123456789', {
        credentials: 'include',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
          Accept: '*/*',
          'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
          Cookie: 'd=test-xoxd-token',
          Authorization: 'Bearer test-xoxc-token',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: 'param1=value1&param2=value2',
        mode: 'cors',
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle empty body', async () => {
      const mockResponse = { ok: true, data: 'test' }
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const body = new URLSearchParams()
      const result = await runSlackPost('test.method', body)

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: '',
        }),
      )

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      const body = new URLSearchParams({ param: 'value' })
      await expect(runSlackPost('test.method', body)).rejects.toThrow('Failed to fetch test.method')
    })

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const body = new URLSearchParams({ param: 'value' })
      await expect(runSlackPost('test.method', body)).rejects.toThrow('Network error')
    })

    it('should handle JSON parsing errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response)

      const body = new URLSearchParams({ param: 'value' })
      await expect(runSlackPost('test.method', body)).rejects.toThrow('Invalid JSON')
    })
  })
})
