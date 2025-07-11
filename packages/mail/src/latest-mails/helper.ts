import { ImapFlow } from 'imapflow'

import type { MailAccountResult, MailEntry, AccountCredentials } from './types.js'

// Parse MAIL_ACCOUNTS env var (robust against @ and : in user/pass)
export function parseMailAccounts(): AccountCredentials[] {
  const env = process.env.MAIL_ACCOUNTS
  console.log('here')
  if (!env) throw new Error('MAIL_ACCOUNTS env variable is not set')
  return env
    .split(' ')
    .filter(Boolean)
    .map((entry) => {
      // Robust parsing: split at LAST @ for host/port, FIRST : for user/pass
      const atIdx = entry.lastIndexOf('@')
      if (atIdx === -1)
        throw new Error(`Invalid MAIL_ACCOUNTS entry: Could not split at LAST @ for host/port, FIRST for user/pass`)
      const cred = entry.slice(0, atIdx)
      const hostPort = entry.slice(atIdx + 1)
      const colonIdx = cred.indexOf(':')
      if (colonIdx === -1) throw new Error(`Invalid MAIL_ACCOUNTS entry (missing colon in user:pass)`)
      const user = cred.slice(0, colonIdx)
      const pass = cred.slice(colonIdx + 1)
      const hostPortMatch = hostPort.match(/^(.*):(\d+)$/)
      if (!hostPortMatch) throw new Error(`Invalid MAIL_ACCOUNTS entry (host:port): ${entry}`)
      return {
        user,
        pass,
        host: hostPortMatch[1],
        port: Number(hostPortMatch[2]),
      }
    })
}

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
