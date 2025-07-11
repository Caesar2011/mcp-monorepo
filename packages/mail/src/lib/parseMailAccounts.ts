// Shared parseMailAccounts for mail tools (mark-as-seen, latest-mails)
import type { AccountCredentials } from '../mark-as-seen/types.js'

/**
 * Parses the MAIL_ACCOUNTS env variable into an array of AccountCredentials.
 * Format: user:pass@host:port (space-separated for multiple accounts)
 * Handles special characters in user/pass robustly.
 * Throws on invalid/missing format.
 */
export function parseMailAccounts(): AccountCredentials[] {
  const env = process.env.MAIL_ACCOUNTS
  if (!env) throw new Error('MAIL_ACCOUNTS env variable is not set')
  return env
    .split(' ')
    .filter(Boolean)
    .map((entry) => {
      const atIdx = entry.lastIndexOf('@')
      if (atIdx === -1)
        throw new Error('Invalid MAIL_ACCOUNTS entry: Could not split at LAST @ for host/port, FIRST for user/pass')
      const cred = entry.slice(0, atIdx)
      const hostPort = entry.slice(atIdx + 1)
      const colonIdx = cred.indexOf(':')
      if (colonIdx === -1) throw new Error('Invalid MAIL_ACCOUNTS entry (missing colon in user:pass)')
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
