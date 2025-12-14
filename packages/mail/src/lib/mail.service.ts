import { withImapClient } from './imap.js'
import { convertHtmlToText, findTextPart, getStartOfPeriodUTC, mapImapMessageToMail, streamToString } from './utils.js'

import type { AccountCredentials, Mail, MailMarkResult, ReadMailResult } from './types.js'
import type { ImapFlow, SearchObject } from 'imapflow'

async function fetchAndMapMails(client: ImapFlow, uids: number[], accountIdentifier: string): Promise<Mail[]> {
  if (!uids || uids.length === 0) {
    return []
  }

  const fetchedMails: Mail[] = []
  for await (const msg of client.fetch(uids, { envelope: true, flags: true, uid: true }, { uid: true })) {
    fetchedMails.push(mapImapMessageToMail(msg, accountIdentifier))
  }
  return fetchedMails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function searchMails(
  account: AccountCredentials,
  { searchString, searchBody, fromContains }: { searchString?: string; searchBody?: boolean; fromContains?: string },
): Promise<Mail[]> {
  const accountIdentifier = `${account.user}@${account.host}`

  return withImapClient(account, async (client) => {
    const orConditions: SearchObject[] = []
    if (searchString) {
      orConditions.push({ subject: searchString })
      if (searchBody) {
        orConditions.push({ body: searchString })
      }
    }
    if (fromContains) {
      orConditions.push({ from: fromContains })
    }

    const searchQuery: SearchObject = orConditions.length > 1 ? { or: orConditions } : orConditions[0]
    const uids = (await client.search(searchQuery, { uid: true })) || []
    return fetchAndMapMails(client, uids, accountIdentifier)
  })
}

export async function fetchLatestMails(account: AccountCredentials, days = 2): Promise<Mail[]> {
  const accountIdentifier = `${account.user}@${account.host}`
  return withImapClient(account, async (client) => {
    const uids = (await client.search({ since: getStartOfPeriodUTC(days) }, { uid: true })) || []
    return fetchAndMapMails(client, uids, accountIdentifier)
  })
}

export async function readMailContent(account: AccountCredentials, mailId: string): Promise<ReadMailResult> {
  try {
    return await withImapClient(account, async (client) => {
      const msg = await client.fetchOne(mailId, { envelope: true, bodyStructure: true }, { uid: true })
      if (!msg) throw new Error(`Mail with ID ${mailId} not found.`)

      const textPart = msg.bodyStructure && findTextPart(msg.bodyStructure, 'plain')
      const htmlPart = msg.bodyStructure && findTextPart(msg.bodyStructure, 'html')

      let content = ''
      if (textPart?.part) {
        const { content: stream } = await client.download(mailId, textPart.part, { uid: true })
        content = await streamToString(stream)
      } else if (htmlPart?.part) {
        const { content: stream } = await client.download(mailId, htmlPart.part, { uid: true })
        const htmlRaw = await streamToString(stream)
        content = convertHtmlToText(htmlRaw)
      } else {
        throw new Error('No viewable part (text or html) in mail')
      }

      return {
        id: mailId,
        title: msg.envelope?.subject || '(no subject)',
        content,
      }
    })
  } catch (err) {
    return {
      id: mailId,
      title: '',
      content: '',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function markMailAsSeen(account: AccountCredentials, mailId: string): Promise<MailMarkResult> {
  let title = '(unknown title)'
  try {
    await withImapClient(account, async (client) => {
      const msg = await client.fetchOne(mailId, { envelope: true }, { uid: true })
      title = (msg && msg.envelope?.subject) || '(no subject)'

      await client.messageFlagsAdd(mailId, ['\\Seen'], { uid: true })
    })
    return { id: mailId, title, success: true }
  } catch (error) {
    return {
      id: mailId,
      title,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
