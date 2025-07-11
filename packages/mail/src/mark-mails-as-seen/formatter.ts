// Output formatting for mark-mails-as-seen tool
import type { MarkMailsAsSeenResult, MailMarkResult } from './types.js'

// Format a single mail result
function formatMailResult(result: MailMarkResult): string {
  const status = result.success ? '✓' : '✗'
  const errorInfo = result.error ? ` (Error: ${result.error})` : ''
  return `${status} [ID: ${result.id}] ${result.title}${errorInfo}`
}

// Format the complete response
export function formatResponse(data: MarkMailsAsSeenResult): string {
  const header = `# Mark as Seen Results for ${data.account}`
  const summary = `Total processed: ${data.totalProcessed} | Successful: ${data.successCount} | Failed: ${data.failureCount}`

  if (data.results.length === 0) {
    return `${header}\n${summary}\n(no mails processed)`
  }

  const mailResults = data.results.map(formatMailResult).join('\n')
  const errorInfo = data.error ? `\n\nAccount Error: ${data.error}` : ''

  return `${header}\n${summary}\n\n${mailResults}${errorInfo}`
}

export function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return `Error: ${message}`
}
