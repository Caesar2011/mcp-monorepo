/**
 * Types for get-latest-projects tool
 */

// Tool input
export interface GetLatestProjectsParams {
  maxResults?: number
}

// Partial Jira project response (for type reference)
export interface JiraProject {
  id: string
  key: string
  name: string
  projectTypeKey?: string
  avatarUrls?: Record<string, string>
  lead?: {
    displayName: string
    accountId: string
  }
  created?: string
}

export interface JiraProjectsListResponse {
  isLast?: boolean
  maxResults: number
  startAt: number
  total: number
  values: JiraProject[]
}
