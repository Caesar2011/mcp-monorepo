import { Readable } from 'stream'

import { describe, it, expect } from 'vitest'

import { streamToString, findTextPart, mapImapMessageToMail, convertHtmlToText } from './utils'

import type { FetchMessageObject, MessageStructureObject } from 'imapflow'

describe('lib/utils', () => {
  describe('streamToString', () => {
    it('should convert a readable stream to a string', async () => {
      const stream = Readable.from('hello world')
      const result = await streamToString(stream)
      expect(result).toBe('hello world')
    })
  })

  describe('findTextPart', () => {
    it('should find a top-level text/plain part', () => {
      const struct = { type: 'text/plain', part: '1' } as MessageStructureObject
      expect(findTextPart(struct, 'plain')).toEqual({ part: '1' })
    })
    it('should find a nested text/html part', () => {
      const struct = {
        type: 'multipart/alternative',
        childNodes: [
          { type: 'text/plain', part: '1.1' },
          { type: 'text/html', part: '1.2' },
        ],
      } as MessageStructureObject
      expect(findTextPart(struct, 'html')).toEqual({ part: '1.2' })
    })
    it('should return undefined if no part is found', () => {
      const struct = { type: 'image/jpeg', part: '1' } as MessageStructureObject
      expect(findTextPart(struct, 'plain')).toBeUndefined()
    })
  })

  describe('convertHtmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<h1>Title</h1><p>Hello</p>'
      const text = convertHtmlToText(html)
      expect(text).toBe('Title\n\nHello')
    })
  })

  describe('mapImapMessageToMail', () => {
    it('should map an IMAP message to a Mail object', () => {
      const date = new Date()
      const msg = {
        uid: 123,
        flags: new Set(['\\Seen']),
        envelope: {
          subject: 'Test Subject',
          from: [{ name: 'Sender', address: 'sender@example.com' }],
          date,
        },
      } as FetchMessageObject
      const accountId = 'user@host'
      const mail = mapImapMessageToMail(msg, accountId)
      expect(mail).toEqual({
        uid: '123',
        account: accountId,
        title: 'Test Subject',
        read: true,
        from: { name: 'Sender', address: 'sender@example.com' },
        date: date.toISOString().slice(0, 16).replace('T', ' '),
      })
    })

    it('should handle missing envelope details gracefully', () => {
      const msg = { uid: 456, flags: new Set() } as FetchMessageObject
      const accountId = 'user@host'
      const mail = mapImapMessageToMail(msg, accountId)
      expect(mail.title).toBe('(no subject)')
      expect(mail.read).toBe(false)
      expect(mail.from).toEqual({ address: undefined, name: undefined })
    })
  })
})
