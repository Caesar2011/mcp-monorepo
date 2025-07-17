/**
 * Types for get-issue tool
 */

// Tool input
export interface GetIssueParams {
  issueIdOrKey: string
  fields?: string[]
  expand?: string[]
}

// Partial Jira issue response (for type reference)
export interface JiraIssue {
  id: string
  key: string
  fields: Record<string, unknown>
  expand?: string
}
