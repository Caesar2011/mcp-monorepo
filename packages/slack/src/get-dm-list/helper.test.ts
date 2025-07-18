import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { fetchDmList } from './helper.js'

describe('fetchDmList', () => {
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

  it('should fetch DM list and user data successfully', async () => {
    const mockDmResponse = {
      ok: true,
      ims: [
        {
          id: 'D123',
          channel: { user: 'U123' },
          message: { text: 'Hello', ts: '1234567890', user: 'U123' },
        },
      ],
      mpims: [
        {
          id: 'G456',
          channel: { members: ['U123', 'U456'] },
          message: { text: 'Group message', ts: '1234567891', user: 'U456' },
        },
      ],
    }

    const mockUsersResponse = {
      ok: true,
      results: [
        { id: 'U123', name: 'john.doe', real_name: 'John Doe' },
        { id: 'U456', name: 'jane.smith', real_name: 'Jane Smith' },
      ],
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDmResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsersResponse),
      })

    const result = await fetchDmList()

    expect(global.fetch).toHaveBeenCalledTimes(2)

    // Check first call (DM list)
    expect(global.fetch).toHaveBeenNthCalledWith(1,
      expect.stringContaining('client.dms'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Bearer dummyc',
        }),
      })
    )

    // Check second call (users info)
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      expect.stringContaining('users/info'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json;charset=UTF-8',
        }),
      })
    )

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      type: 'im',
      channelId: 'D123',
      userId: 'U123',
      userRealName: 'John Doe',
      userSlackName: 'john.doe',
      lastMessage: {
        text: 'Hello',
        ts: '1234567890',
        userId: 'U123',
        userRealName: 'John Doe',
        userSlackName: 'john.doe',
      },
    })
    expect(result[1]).toEqual({
      type: 'mpim',
      channelId: 'G456',
      members: [
        { userId: 'U123', realName: 'John Doe', slackName: 'john.doe' },
        { userId: 'U456', realName: 'Jane Smith', slackName: 'jane.smith' },
      ],
      lastMessage: {
        text: 'Group message',
        ts: '1234567891',
        userId: 'U456',
        userRealName: 'Jane Smith',
        userSlackName: 'jane.smith',
      },
    })
  })

  it('should throw error when DM fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(fetchDmList()).rejects.toThrow('Failed to fetch DM list')
  })

  it('should throw error when users fetch fails', async () => {
    const mockDmResponse = {
      ok: true,
      ims: [{ id: 'D123', channel: { user: 'U123' } }],
      mpims: [],
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDmResponse),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

    await expect(fetchDmList()).rejects.toThrow('Failed to fetch users for DMs')
  })

  it('should handle empty DM and MPIM lists', async () => {
    const mockDmResponse = {
      ok: true,
      ims: [],
      mpims: [],
    }

    const mockUsersResponse = {
      ok: true,
      results: [],
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDmResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsersResponse),
      })

    const result = await fetchDmList()

    expect(result).toHaveLength(0)
  })

  it('should throw error when required environment variables are missing', async () => {
    delete process.env.XOXD_TOKEN

    await expect(fetchDmList()).rejects.toThrow()
  })
})
