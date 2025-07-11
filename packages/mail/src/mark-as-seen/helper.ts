// Business logic for mark-as-seen tool
import { ImapFlow } from 'imapflow'

import type {
  MarkAsSeenParams,
  ValidatedParams,
  AccountCredentials,
  MarkAsSeenResult,
  MailMarkResult,
} from './types.js'

// Parse MAIL_ACCOUNTS env var (robust against @ and : in user/pass)
export function parseMailAccounts(): AccountCredentials[] {
  const env = process.env.MAIL_ACCOUNTS
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
      const hostPortMatch = hostPort.match(/^(.*?):(\d+)$/)
      if (!hostPortMatch) throw new Error(`Invalid MAIL_ACCOUNTS entry (host:port): ${entry}`)
      return {
        user,
        pass,
        host: hostPortMatch[1],
        port: Number(hostPortMatch[2]),
      }
    })
}

// Input validation
export const validateInput = (params: MarkAsSeenParams): ValidatedParams => {
  if (!params.username) {
    throw new Error('Username is required')
  }
  if (!params.imapServer) {
    throw new Error('IMAP server is required')
  }
  if (!params.mailIds || params.mailIds.length === 0) {
    throw new Error('Mail IDs array is required and must not be empty')
  }
  return params as ValidatedParams
}

// Find account matching username and IMAP server
export function findMatchingAccount(
  accounts: AccountCredentials[],
  username: string,
  imapServer: string,
): AccountCredentials {
  const account = accounts.find((acc) => acc.user === username && acc.host === imapServer)
  if (!account) {
    throw new Error(`No account found for username '${username}' on server '${imapServer}'`)
  }
  return account
}

// Mark specific mails as seen
export async function markMailsAsSeen(params: ValidatedParams): Promise<MarkAsSeenResult> {
  const accounts = parseMailAccounts()
  const account = findMatchingAccount(accounts, params.username, params.imapServer)

  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.user, pass: account.pass },
  })

  const results: MailMarkResult[] = []
  let successCount = 0
  let failureCount = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      for (const mailId of params.mailIds) {
        let title: string | undefined = undefined
        try {
          for await (const msg of client.fetch(
            `${mailId}`,
            {
              envelope: true,
              uid: true,
            },
            { uid: true },
          )) {
            title = msg.envelope?.subject
          }

          await client.messageFlagsAdd(`${mailId}`, ['\\Seen'], { uid: true })
          results.push({
            id: mailId,
            title: title || '(no subject)',
            success: true,
          })
          successCount++
        } catch (error) {
          results.push({
            id: mailId,
            title: title || '(no subject)',
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
          failureCount++
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    try {
      await client.logout()
    } catch {
      // Ignore logout errors
    }
  }

  return {
    account: `${account.user}@${account.host}`,
    totalProcessed: params.mailIds.length,
    successCount,
    failureCount,
    results,
  }
}
