import { ImapFlow } from 'imapflow'

import { parseMailAccounts } from '../lib/parseMailAccounts.js'

import type { MailAccountResult, MailEntry, AccountCredentials } from './types.js'

function isMailFromYesterdayOrToday(date: Date): boolean {
  const now = new Date()
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const startYesterday = new Date(startToday.getTime() - 24 * 60 * 60 * 1000)
  return date >= startYesterday && date < new Date(startToday.getTime() + 24 * 60 * 60 * 1000)
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
    for await (const msg of client.fetch('1:*', {
      envelope: true,
      flags: true,
      uid: true,
      internalDate: true,
    })) {
      if (!msg.envelope?.date) continue
      const mailDate = msg.envelope.date instanceof Date ? msg.envelope.date : new Date(msg.envelope.date)
      if (!isMailFromYesterdayOrToday(mailDate)) continue
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
  console.log(accounts)
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
