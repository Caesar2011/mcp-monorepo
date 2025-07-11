import { ImapFlow } from 'imapflow'

import { parseMailAccounts } from '../lib/parseMailAccounts.js'

import type {
  MarkAsSeenParams,
  ValidatedParams,
  AccountCredentials,
  MarkAsSeenResult,
  MailMarkResult,
} from './types.js'

// Input validation
export const validateInput = (params: MarkAsSeenParams): void => {
  if (!params.username) {
    throw new Error('Username is required')
  }
  if (!params.imapServer) {
    throw new Error('IMAP server is required')
  }
  if (!params.mailIds || params.mailIds.length === 0) {
    throw new Error('Mail IDs array is required and must not be empty')
  }
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
