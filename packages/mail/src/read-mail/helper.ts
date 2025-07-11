import { htmlToText } from 'html-to-text'
import { ImapFlow, type MessageStructureObject } from 'imapflow'

import { parseMailAccounts } from '../lib/parseMailAccounts.js'

import type { ReadMailParams, ReadMailResult } from './types.js'

function findMatchingAccount(username: string, imapServer: string) {
  const accounts = parseMailAccounts()
  return accounts.find((a) => a.user === username && a.host === imapServer)
}

export async function readMailContents(params: ReadMailParams): Promise<ReadMailResult[]> {
  const account = findMatchingAccount(params.username, params.imapServer)
  if (!account) {
    return params.mailIds.map((id) => ({ id, title: '', content: '', error: 'Account not found' }))
  }
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.user, pass: account.pass },
  })
  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    // Fetch envelope and bodystructure for all requested IDs
    const results: ReadMailResult[] = []
    for (const mailId of params.mailIds) {
      try {
        let envelope, bodyStructure
        for await (const msg of client.fetch(
          mailId,
          { envelope: true, bodyStructure: true, uid: true },
          { uid: true },
        )) {
          envelope = msg.envelope
          bodyStructure = msg.bodyStructure
        }
        if (!bodyStructure) throw new Error('No bodystructure found')
        // Find text/plain or text/html part
        const textPart = findTextPart(bodyStructure, 'plain')
        const htmlPart = findTextPart(bodyStructure, 'html')
        let content = ''
        if (textPart) {
          const { content: stream } = await client.download(mailId, textPart.part, { uid: true })
          content = await streamToString(stream)
        } else if (htmlPart) {
          const { content: stream } = await client.download(mailId, htmlPart.part, { uid: true })
          const htmlRaw = await streamToString(stream)
          content = htmlToText(htmlRaw, { wordwrap: 130, selectors: [{ selector: 'script,style', format: 'skip' }] })
        } else {
          throw new Error('No viewable part (text or html) in mail')
        }
        results.push({
          id: mailId,
          title: envelope?.subject || '',
          content,
        })
      } catch (err: unknown) {
        results.push({ id: mailId, title: '', content: '', error: err instanceof Error ? err.message : String(err) })
      }
    }
    return results
  } finally {
    lock.release()
    await client.logout()
  }
}

function findTextPart(struct: MessageStructureObject, subtype: 'plain' | 'html'): { part: string } | undefined {
  const typeMatch = struct.type?.toLowerCase().split('/')
  if (typeMatch && typeMatch[0] === 'text' && struct.part && typeMatch[1] === subtype) {
    return { part: struct.part }
  }
  if (struct.childNodes && Array.isArray(struct.childNodes)) {
    for (const child of struct.childNodes) {
      const found = findTextPart(child, subtype)
      if (found) return found
    }
  }
  return undefined
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}
