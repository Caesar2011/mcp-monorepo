/**
 * Output formatting for set-issue-status tool
 */

export function formatSetIssueStatusResponse(status: number, ok: boolean, transitionName?: string): string {
  if (ok) {
    return `HTTP ${status}\nIssue transitioned${transitionName ? ` to: ${transitionName}` : ''}`
  }
  return `HTTP ${status}\nFailed to transition issue.`
}

export function formatSetIssueStatusError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error setting issue status: ${message}`
}
