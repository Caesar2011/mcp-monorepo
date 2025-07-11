// Output formatting for read-mail
import type { ReadMailResult } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export function formatReadMailResponse(mails: ReadMailResult[]): CallToolResult {
  return {
    content: mails.map((m) => ({
      type: 'text',
      text: `Title: ${m.title}\n\nContent:\n${m.content}`,
      ...(m.error ? { _meta: { error: m.error, mailId: m.id } } : {}),
    })),
  }
}

export function formatReadMailError(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
        _meta: { error: message },
      },
    ],
  }
}
