import { describe, it, expect, vi, beforeEach } from 'vitest'

import { resolveUser, resolveChannel, resolveMessageText } from './resolvers.js'

vi.mock('./channel-cache.js', () => ({
  getChannelListCache: vi.fn(),
}))

vi.mock('./user-cache.js', () => ({
  getMemberListCache: vi.fn(),
}))

describe('resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveUser', () => {
    it('should resolve user ID to name with handle', async () => {
      const mockUsers = {
        U123: { real_name: 'John Doe' },
        U456: { real_name: 'Jane Smith' },
      }

      const { getMemberListCache } = await import('./user-cache.js')
      vi.mocked(getMemberListCache).mockResolvedValue(mockUsers)

      const result = await resolveUser('U123')

      expect(getMemberListCache).toHaveBeenCalled()
      expect(result).toBe('John Doe <@U123>')
    })

    it('should return handle only when user not found in cache', async () => {
      const mockUsers = {
        U456: { real_name: 'Jane Smith' },
      }

      const { getMemberListCache } = await import('./user-cache.js')
      vi.mocked(getMemberListCache).mockResolvedValue(mockUsers)

      const result = await resolveUser('U999')

      expect(result).toBe('<@U999>')
    })

    it('should return handle only when userId is undefined', async () => {
      const result = await resolveUser(undefined)

      expect(result).toBe('<@undefined>')
    })

    it('should return handle only when userId is empty string', async () => {
      const mockUsers = {}

      const { getMemberListCache } = await import('./user-cache.js')
      vi.mocked(getMemberListCache).mockResolvedValue(mockUsers)

      const result = await resolveUser('')

      expect(result).toBe('<@>')
    })

    it('should handle cache errors gracefully', async () => {
      const { getMemberListCache } = await import('./user-cache.js')
      vi.mocked(getMemberListCache).mockRejectedValue(new Error('Cache error'))

      await expect(resolveUser('U123')).rejects.toThrow('Cache error')
    })
  })

  describe('resolveChannel', () => {
    it('should resolve channel ID to name with handle', async () => {
      const mockChannels = [
        { id: 'C123', name: 'general', is_im: false },
        { id: 'C456', name: 'random', is_im: false },
      ]

      const { getChannelListCache } = await import('./channel-cache.js')
      vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

      const result = await resolveChannel('C123')

      expect(getChannelListCache).toHaveBeenCalled()
      expect(result).toBe('#general <#C123>')
    })

    it('should resolve DM channel to user', async () => {
      const mockChannels = [{ id: 'D123', is_im: true, user: 'U123' }]

      const mockUsers = {
        U123: { real_name: 'John Doe' },
      }

      const { getChannelListCache } = await import('./channel-cache.js')
      const { getMemberListCache } = await import('./user-cache.js')
      vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)
      vi.mocked(getMemberListCache).mockResolvedValue(mockUsers)

      const result = await resolveChannel('D123')

      expect(result).toBe('John Doe <@U123>')
    })

    it('should return handle only when channel not found', async () => {
      const mockChannels = [{ id: 'C456', name: 'random', is_im: false }]

      const { getChannelListCache } = await import('./channel-cache.js')
      vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

      const result = await resolveChannel('C999')

      expect(result).toBe('<#C999>')
    })

    it('should return handle only when channelId is undefined', async () => {
      const result = await resolveChannel(undefined)

      expect(result).toBe('<#undefined>')
    })

    it('should return handle only when channelId is empty string', async () => {
      const mockChannels = []

      const { getChannelListCache } = await import('./channel-cache.js')
      vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

      const result = await resolveChannel('')

      expect(result).toBe('<#>')
    })

    it('should handle cache errors gracefully', async () => {
      const { getChannelListCache } = await import('./channel-cache.js')
      vi.mocked(getChannelListCache).mockRejectedValue(new Error('Cache error'))

      await expect(resolveChannel('C123')).rejects.toThrow('Cache error')
    })
  })

  describe('resolveMessageText', () => {
    beforeEach(async () => {
      const mockUsers = {
        U123: { real_name: 'John Doe' },
        U456: { real_name: 'Jane Smith' },
      }

      const mockChannels = [
        { id: 'C123', name: 'general', is_im: false },
        { id: 'C456', name: 'random', is_im: false },
        { id: 'D789', is_im: true, user: 'U123' },
      ]

      const { getMemberListCache } = await import('./user-cache.js')
      const { getChannelListCache } = await import('./channel-cache.js')

      vi.mocked(getMemberListCache).mockResolvedValue(mockUsers)
      vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)
    })

    it('should resolve user mentions in message text', async () => {
      const message = 'Hello <@U123>, how are you?'
      const result = await resolveMessageText(message)

      expect(result).toBe('Hello John Doe <@U123>, how are you?')
    })

    it('should resolve channel mentions in message text', async () => {
      const message = 'Check out <#C123> for updates'
      const result = await resolveMessageText(message)

      expect(result).toBe('Check out #general <#C123> for updates')
    })

    it('should resolve both user and channel mentions', async () => {
      const message = 'Hey <@U123>, please check <#C123> and <#C456>'
      const result = await resolveMessageText(message)

      expect(result).toBe('Hey John Doe <@U123>, please check #general <#C123> and #random <#C456>')
    })

    it('should resolve channel mentions with pipe notation', async () => {
      const message = 'Check <#C123|general> channel'
      const result = await resolveMessageText(message)

      expect(result).toBe('Check #general <#C123> channel')
    })

    it('should handle multiple mentions of the same user/channel', async () => {
      const message = '<@U123> and <@U123> are working on <#C123>'
      const result = await resolveMessageText(message)

      expect(result).toBe('John Doe <@U123> and John Doe <@U123> are working on #general <#C123>')
    })

    it('should handle unknown user mentions', async () => {
      const message = 'Hello <@U999>, how are you?'
      const result = await resolveMessageText(message)

      expect(result).toBe('Hello <@U999>, how are you?')
    })

    it('should handle unknown channel mentions', async () => {
      const message = 'Check out <#C999> for updates'
      const result = await resolveMessageText(message)

      expect(result).toBe('Check out <#C999> for updates')
    })

    it('should return empty string when message is undefined', async () => {
      const result = await resolveMessageText(undefined)

      expect(result).toBe('')
    })

    it('should return empty string when message is empty', async () => {
      const result = await resolveMessageText('')

      expect(result).toBe('')
    })

    it('should return original message when no mentions found', async () => {
      const message = 'This is a regular message without mentions'
      const result = await resolveMessageText(message)

      expect(result).toBe('This is a regular message without mentions')
    })

    it('should handle DM channel mentions by resolving to user', async () => {
      const message = 'Check <#D789> for private discussion'
      const result = await resolveMessageText(message)

      expect(result).toBe('Check John Doe <@U123> for private discussion')
    })

    it('should handle malformed mentions gracefully', async () => {
      const message = 'Hello <@> and <#> and <@INVALID> and <#INVALID>'
      const result = await resolveMessageText(message)

      expect(result).toBe('Hello <@> and <#> and <@INVALID> and <#INVALID>')
    })
  })
})
