// Efficient fetch-latest-mails using search
import { ImapFlow, type SearchObject } from 'imapflow'

import { parseMailAccounts } from '../lib/parseMailAccounts.js'

import type { MailAccountResult, MailEntry, AccountCredentials } from './types.js'

// Calculate start of yesterday (UTC)
function getStartOfYesterdayUTC(): Date {
  const now = new Date()
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  // Subtract one day for start of yesterday
  return new Date(startToday.getTime() - 24 * 60 * 60 * 1000)
}

// Calculate end of today (UTC)
function getEndOfTodayUTC(): Date {
  const now = new Date()
  const endToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - 1)
  return endToday
}

export async function fetchMailsForAccount(account: AccountCredentials): Promise<MailAccountResult> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.user, pass: account.pass },
  })
  const mails: MailEntry[] = []
  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    // Search for mails since start of yesterday
    const since = getStartOfYesterdayUTC()
    const searchQuery: SearchObject = { since }

    // Get UIDs of matching messages
    const uids = (await client.search(searchQuery, { uid: true })) || []
    if (uids.length === 0) {
      return { account: `${account.user}@${account.host}`, mails }
    }
    const uidRange = uids.join(',')
    for await (const msg of client.fetch(
      uidRange,
      {
        envelope: true,
        flags: true,
        uid: true,
        internalDate: true,
      },
      { uid: true },
    )) {
      if (!msg.envelope?.date) continue
      const mailDate = msg.envelope.date instanceof Date ? msg.envelope.date : new Date(msg.envelope.date)
      // Only include mails up to end of today (future mails are ignored)
      if (mailDate > getEndOfTodayUTC()) continue
      const from = msg.envelope.from && msg.envelope.from[0]
      mails.push({
        id: String(msg.uid),
        subject: msg.envelope.subject || '(no subject)',
        read: msg.flags ? [...msg.flags].some((flag) => flag.toLowerCase().includes('seen')) : false,
        from: { address: from?.address, name: from?.name },
        date: mailDate.toISOString().slice(0, 16),
      })
    }
  } finally {
    lock.release()
    await client.logout()
  }
  return { account: `${account.user}@${account.host}`, mails }
}

export async function fetchLatestMails(): Promise<MailAccountResult[]> {
  const accounts = parseMailAccounts()
  if (!accounts.length) throw new Error('MAIL_ACCOUNTS env variable is not set')
  const results: MailAccountResult[] = []
  for (const account of accounts) {
    try {
      results.push(await fetchMailsForAccount(account))
    } catch (err) {
      results.push({ account: `${account.user}@${account.host}`, mails: [], error: err })
    }
  }
  return results
}
