/**
 * Types for set-issue-status tool
 */

export interface SetIssueStatusParams {
  issueIdOrKey: string
  status?: string
  transitionId?: string
  comment?: string
}

export interface JiraTransition {
  id: string
  name: string
  to: {
    name: string
    id: string
  }
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[]
}
