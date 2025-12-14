import { logger } from '@mcp-monorepo/shared'
import { ImapFlow, type MailboxLockObject } from 'imapflow'

import type { AccountCredentials } from './types.js'

export async function withImapClient<T>(
  account: AccountCredentials,
  action: (client: ImapFlow, lock: MailboxLockObject) => Promise<T>,
): Promise<T> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.user, pass: account.pass },
    logger: false, // Set to true for verbose IMAP logging
  })

  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    return await action(client, lock)
  } finally {
    lock.release()
    await client.logout().catch((e) => logger.warn(`Failed to logout from ${account.host}`, e))
  }
}
