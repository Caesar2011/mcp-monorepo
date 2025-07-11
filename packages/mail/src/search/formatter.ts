// Output formatting for search tool
import type { SearchMailAccountResult, SearchMailEntry } from './types.js'

function formatMailLine(mail: SearchMailEntry): string {
  const readState = mail.read ? 'read' : 'unread'
  const nameDisplay = mail.from.name ? ` <${mail.from.name}>` : ''
  return `[ID: ${mail.uid}] ${mail.title} [${readState}][from: ${mail.from.address}${nameDisplay}][at: ${mail.date}]`
}

export function formatResponse(data: SearchMailAccountResult[]): string {
  return data
    .map(({ account, error, mails }) => {
      if (mails.length === 0) {
        return `# ${account}\n(no matching mails)${error ? `\n${formatError(error)}` : ''}`
      }
      return `# ${account}` + '\n' + mails.map(formatMailLine).join('\n')
    })
    .join('\n\n')
}

export function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return `Error: ${message}`
}
