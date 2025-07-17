/**
 * Types for execute-jql tool
 */

// Tool input
export interface ExecuteJqlParams {
  jql: string
  maxResults?: number
  startAt?: number
  fields?: string[]
}

// Partial Jira issue response (for type reference)
export interface JiraIssue {
  id: string
  key: string
  fields: Record<string, unknown>
}

export interface JiraJqlResponse {
  expand?: string
  startAt: number
  maxResults: number
  total: number
  issues: JiraIssue[]
}
