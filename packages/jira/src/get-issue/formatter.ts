/**
 * Output formatting for get-issue tool
 */
import type { JiraIssue } from './types.js'

export function formatIssueResponse(status: number, data?: JiraIssue): string {
  if (!data) return `HTTP ${status} (no response body)`
  const lines = [
    `HTTP ${status}`,
    `Key: ${data.key}`,
    ...(data.fields
      ? [
          `Summary: ${data.fields['summary']}`,
          data.fields['status'] ? `Status: ${(data.fields['status'] as { name?: string }).name}` : '',
          data.fields['assignee']
            ? `Assignee: ${(data.fields['assignee'] as { displayName?: string })?.displayName}`
            : '',
          data.fields['description'] ? `Description: ${data.fields['description']}` : '',
        ].filter(Boolean)
      : []),
  ]
  return lines.join('\n')
}

export function formatIssueError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error getting issue: ${message}`
}
