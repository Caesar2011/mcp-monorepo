/**
 * Output formatting for execute-jql tool
 */
import type { JiraJqlResponse } from './types.js'

export function formatJqlResponse(status: number, data?: JiraJqlResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  const issues = data.issues?.map(
    // @ts-expect-error Name will exist
    (issue) => `- ${issue.key}: ${issue.fields['summary']} [${issue.fields['status']?.name ?? ''}]`,
  )
  return [`HTTP ${status}`, `Total: ${data.total}`, ...(issues?.length ? issues : ['No issues found'])].join('\n')
}

export function formatJqlError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error executing JQL: ${message}`
}
