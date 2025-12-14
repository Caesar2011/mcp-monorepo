import { htmlToText } from 'html-to-text'

import type { Mail } from './types.js'
import type { FetchMessageObject, MessageStructureObject } from 'imapflow'

export async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

export function findTextPart(struct: MessageStructureObject, subtype: 'plain' | 'html'): { part: string } | undefined {
  if (struct.type?.toLowerCase() === `text/${subtype}` && struct.part) {
    return { part: struct.part }
  }
  if (struct.childNodes) {
    for (const child of struct.childNodes) {
      const found = findTextPart(child, subtype)
      if (found) return found
    }
  }
  return undefined
}

export function convertHtmlToText(html: string): string {
  return htmlToText(html, {
    wordwrap: 130,
    selectors: [{ selector: 'h1', options: { uppercase: false } }],
  })
}

export function mapImapMessageToMail(msg: FetchMessageObject, accountIdentifier: string): Mail {
  const from = msg.envelope?.from?.[0]
  const date = msg.envelope?.date ?? new Date()

  return {
    uid: String(msg.uid),
    account: accountIdentifier,
    title: msg.envelope?.subject || '(no subject)',
    read: msg.flags?.has('\\Seen') ?? false,
    date: date.toISOString().slice(0, 16).replace('T', ' '),
    from: { address: from?.address, name: from?.name },
  }
}

export const getStartOfPeriodUTC = (daysAgo: number): Date => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
