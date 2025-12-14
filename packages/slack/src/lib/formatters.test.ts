import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatMessageElement, formatMessage, formatChannel, formatStatement, formatError } from './formatters.js'
import { type MpIM } from './types'

vi.mock('./resolvers.js', () => ({
  resolveUser: vi.fn(),
  resolveMessageText: vi.fn(),
}))

describe('formatters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatMessageElement', () => {
    it('should format a message element with user and reactions', async () => {
      const { resolveUser, resolveMessageText } = await import('./resolvers.js')
      vi.mocked(resolveUser).mockResolvedValue('John Doe')
      vi.mocked(resolveMessageText).mockResolvedValue('Hello world')

      const msg = {
        user: 'U123',
        text: 'Hello world',
        reactions: [
          { name: 'thumbsup', count: 3 },
          { name: 'heart', count: 2 },
        ],
      }

      const result = await formatMessageElement(msg)

      expect(resolveUser).toHaveBeenCalledWith('U123')
      expect(resolveMessageText).toHaveBeenCalledWith('Hello world')
      expect(result).toEqual({
        from: 'John Doe',
        text: 'Hello world',
        reactions: 5,
      })
    })

    it('should handle message element without reactions', async () => {
      const { resolveUser, resolveMessageText } = await import('./resolvers.js')
      vi.mocked(resolveUser).mockResolvedValue('Jane Doe')
      vi.mocked(resolveMessageText).mockResolvedValue('No reactions')

      const msg = {
        user: 'U456',
        text: 'No reactions',
      }

      const result = await formatMessageElement(msg)

      expect(result).toEqual({
        from: 'Jane Doe',
        text: 'No reactions',
        reactions: 0,
      })
    })

    it('should handle undefined message element', async () => {
      const result = await formatMessageElement(undefined)

      expect(result).toEqual({
        from: 'unknown',
        text: 'unknown',
        reactions: 0,
      })
    })

    it('should handle message element with unknown user', async () => {
      const { resolveUser, resolveMessageText } = await import('./resolvers.js')
      vi.mocked(resolveUser).mockResolvedValue(undefined)
      vi.mocked(resolveMessageText).mockResolvedValue('Message text')

      const msg = {
        user: 'U999',
        text: 'Message text',
      }

      const result = await formatMessageElement(msg)

      expect(result).toEqual({
        from: 'unknown',
        text: 'Message text',
        reactions: 0,
      })
    })
  })

  describe('formatMessage', () => {
    it('should format a message with replies', async () => {
      const { resolveUser, resolveMessageText } = await import('./resolvers.js')
      vi.mocked(resolveUser)
        .mockResolvedValueOnce('Main User')
        .mockResolvedValueOnce('Reply User 1')
        .mockResolvedValueOnce('Reply User 2')
      vi.mocked(resolveMessageText)
        .mockResolvedValueOnce('Main message')
        .mockResolvedValueOnce('Reply 1')
        .mockResolvedValueOnce('Reply 2')

      const msg = {
        user: 'U123',
        text: 'Main message',
        reactions: [{ name: 'thumbsup', count: 1 }],
        replies: [
          { user: 'U456', text: 'Reply 1' },
          { user: 'U789', text: 'Reply 2' },
        ],
      }

      const result = await formatMessage(msg)

      expect(result).toEqual({
        from: 'Main User',
        text: 'Main message',
        reactions: 1,
        replies: [
          { from: 'Reply User 1', text: 'Reply 1', reactions: 0 },
          { from: 'Reply User 2', text: 'Reply 2', reactions: 0 },
        ],
      })
    })

    it('should format a message without replies', async () => {
      const { resolveUser, resolveMessageText } = await import('./resolvers.js')
      vi.mocked(resolveUser).mockResolvedValue('User')
      vi.mocked(resolveMessageText).mockResolvedValue('No replies')

      const msg = {
        user: 'U123',
        text: 'No replies',
      }

      const result = await formatMessage(msg)

      expect(result).toEqual({
        from: 'User',
        text: 'No replies',
        reactions: 0,
        replies: [],
      })
    })
  })

  describe('formatChannel', () => {
    it('should format a public channel', async () => {
      const channel = {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_im: false,
        is_mpim: false,
        topic: { value: 'General discussion' },
        purpose: { value: 'Company updates' },
      }

      const result = await formatChannel(channel as MpIM)

      expect(result).toEqual({
        id: 'C123',
        type: 'channel',
        is_public: 'public',
        name: 'general',
        topic: { value: 'General discussion' },
        purpose: { value: 'Company updates' },
      })
    })

    it('should format a private channel', async () => {
      const channel = {
        id: 'C456',
        name: 'private-team',
        is_private: true,
        is_im: false,
        is_mpim: false,
        is_archived: true,
      }

      const result = await formatChannel(channel)

      expect(result).toEqual({
        id: 'C456',
        type: 'channel',
        is_public: 'private',
        name: 'private-team',
        is_archived: true,
      })
    })

    it('should format a group direct message', async () => {
      const channel = {
        id: 'G123',
        is_private: false,
        is_im: false,
        is_mpim: true,
        name: 'group-dm',
      }

      const result = await formatChannel(channel)

      expect(result).toEqual({
        id: 'G123',
        type: 'direct_group_message',
        is_public: 'public',
        name: 'group-dm',
      })
    })

    it('should format a direct message', async () => {
      const channel = {
        id: 'D123',
        is_im: true,
        user: 'U123',
        priority: 0.5,
      }

      const result = await formatChannel(channel)

      expect(result).toEqual({
        id: 'D123',
        type: 'direct_message',
        user: 'U123',
        prio: 0.5,
      })
    })
  })

  describe('formatStatement', () => {
    it('should format a simple statement', () => {
      const result = formatStatement('Test message')

      expect(result).toEqual({
        message: 'Test message',
      })
    })

    it('should format an empty statement', () => {
      const result = formatStatement('')

      expect(result).toEqual({
        message: '',
      })
    })
  })

  describe('formatError', () => {
    it('should format an Error object', () => {
      const error = new Error('Something went wrong')
      const result = formatError(error)

      expect(result).toBe('Error getting Slack channel content: Something went wrong')
    })

    it('should format a string error', () => {
      const result = formatError('String error')

      expect(result).toBe('Error getting Slack channel content: Unknown error')
    })

    it('should format an unknown error', () => {
      const result = formatError(undefined)

      expect(result).toBe('Error getting Slack channel content: Unknown error')
    })

    it('should format an object error', () => {
      const result = formatError({ message: 'Object error' })

      expect(result).toBe('Error getting Slack channel content: Unknown error')
    })
  })
})
