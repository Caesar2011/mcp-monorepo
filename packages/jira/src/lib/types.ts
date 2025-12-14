export interface JiraIssue {
  id: string
  key: string
  fields: Record<string, unknown> & {
    summary?: string
    status?: { name?: string }
    assignee?: { displayName?: string }
    description?: string
  }
  expand?: string
}

export interface JiraJqlResponse {
  expand?: string
  startAt: number
  maxResults: number
  total: number
  issues: JiraIssue[]
}

export interface JiraProject {
  id: string
  key: string
  name: string
  projectTypeKey?: string
}

export interface JiraProjectsListResponse {
  isLast?: boolean
  maxResults: number
  startAt: number
  total: number
  values: JiraProject[]
}

export interface JiraProfileResponse {
  self: string
  key: string
  accountId: string
  name: string
  emailAddress: string
  displayName: string
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
  expand?: string
  transitions: JiraTransition[]
}
