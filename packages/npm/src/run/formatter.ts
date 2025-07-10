import type { ExecuteResult } from '../lib/executeNpmCommand.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export function formatRunResult(result: ExecuteResult): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: result.stdout,
        _meta: {
          stderr: result.stderr,
          code: result.code,
        },
      },
    ],
  }
}

export function formatRunError(message: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
        _meta: { stderr: message },
      },
    ],
  }
}
