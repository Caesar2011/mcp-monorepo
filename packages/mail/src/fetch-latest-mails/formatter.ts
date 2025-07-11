// Output formatting for fetch-latest-mails tool
import type { MailAccountResult, MailEntry } from './types.js'

// Formats a single mail entry
function formatMailLine(mail: MailEntry): string {
  const readState = mail.read ? 'read' : 'unread'
  const nameDisplay = mail.from.name ? ` <${mail.from.name}>` : ''
  return `[ID: ${mail.id}] ${mail.subject} [${readState}][from: ${mail.from.address}${nameDisplay}][at: ${mail.date}]`
}

// Formats all account results
export function formatResponse(data: MailAccountResult[]): string {
  return data
    .map(({ account, error, mails }) => {
      if (mails.length === 0) {
        return `# ${account}\n(no mails)${error ? `\n${formatError(error)}` : ''}`
      }
      return `# ${account}` + '\n' + mails.map(formatMailLine).join('\n')
    })
    .join('\n\n')
}

export function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return `Error: ${message}`
}
