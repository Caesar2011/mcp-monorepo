// Helper logic for search tool
import { ImapFlow, type SearchObject } from 'imapflow'

import { parseMailAccounts } from '../lib/parseMailAccounts.js'

import type { SearchMailParams, SearchMailEntry, SearchMailAccountResult } from './types.js'
import type { AccountCredentials } from '../latest-mails/types.js'

function normalizeParams(params: SearchMailParams): SearchMailParams {
  return {
    searchString: params.searchString,
    searchBody: params.searchBody === true,
    fromContains: params.fromContains,
  }
}

async function fetchMailsForAccount(account: AccountCredentials, params: SearchMailParams): Promise<SearchMailEntry[]> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.user, pass: account.pass },
  })
  const mails: SearchMailEntry[] = []
  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    // Build search query using ImapFlow's native search
    let searchQuery: SearchObject = {}
    const orConditions: SearchObject[] = []

    if (params.searchString) {
      // Search in subject
      orConditions.push({ subject: params.searchString })

      // Search in body if requested
      if (params.searchBody) {
        orConditions.push({ body: params.searchString })
      }
    }

    if (params.fromContains) {
      orConditions.push({ from: params.fromContains })
    }

    // If we have multiple search conditions, use OR
    if (orConditions.length > 1) {
      searchQuery.or = orConditions
    } else if (orConditions.length === 1) {
      searchQuery = orConditions[0]
    } else {
      // No search criteria - return empty results
      return mails
    }

    // Perform server-side search to get UIDs
    const uids = (await client.search(searchQuery, { uid: true })) || []

    if (uids.length === 0) {
      return mails
    }

    // Fetch only the matching messages
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
      const mailDate = msg.envelope?.date instanceof Date ? msg.envelope.date : new Date(msg.envelope?.date || '')
      const from = msg.envelope?.from?.[0]
      const subject = msg.envelope?.subject || ''
      const fromAddr = from?.address || ''
      const fromName = from?.name || ''

      mails.push({
        uid: String(msg.uid),
        account: `${account.user}@${account.host}`,
        title: subject || '(no subject)',
        read: msg.flags ? [...msg.flags].some((flag) => flag.toLowerCase().includes('seen')) : false,
        from: { address: fromAddr, name: fromName },
        date: mailDate.toISOString().slice(0, 16),
      })
    }
  } finally {
    lock.release()
    await client.logout()
  }
  return mails
}

export async function searchMails(params: SearchMailParams): Promise<SearchMailAccountResult[]> {
  const norm = normalizeParams(params)
  const accounts = parseMailAccounts()
  const results: SearchMailAccountResult[] = []
  for (const account of accounts) {
    try {
      const mails = await fetchMailsForAccount(account, norm)
      results.push({ account: `${account.user}@${account.host}`, mails })
    } catch (error) {
      results.push({ account: `${account.user}@${account.host}`, mails: [], error })
    }
  }
  return results
}
