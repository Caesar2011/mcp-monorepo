import { type ADFDocument } from 'extended-markdown-adf-parser'

export interface JiraIssue {
  id: string
  key: string
  fields: Record<string, unknown> & {
    summary?: string
    status?: { name?: string }
    assignee?: { displayName?: string; accountId?: string } | null
    description?: string | ADFDocument // String in v2, ADF in v3
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

/**
 * Enhanced JQL search response (v3 /search/jql endpoint)
 * Uses nextPageToken instead of startAt for pagination
 */
export interface JiraEnhancedJqlResponse {
  expand?: string
  maxResults: number
  isLast: boolean
  nextPageToken?: string
  issues: JiraIssue[]
  total?: number // May not always be present
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
  emailAddress: string | null // Nullable in v3 due to GDPR
  displayName: string
  timeZone?: string | null // Nullable in v3
  locale?: string | null // Nullable in v3
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

export interface JiraCreateIssueResponse {
  id: string
  key: string
  self: string
  transition?: {
    status: number
    errorCollection: {
      errorMessages: string[]
      errors: Record<string, string>
    }
  }
}

export interface JiraComment {
  id: string
  self: string
  author: {
    accountId: string
    displayName: string
    emailAddress?: string | null
  }
  body: string | ADFDocument
  created: string
  updated: string
  updateAuthor: {
    accountId: string
    displayName: string
  }
  visibility?: {
    type: string
    value: string
    identifier: string
  }
}

export interface JiraIssueType {
  id: string
  name: string
  description?: string
  subtask: boolean
}

export interface JiraFieldSchema {
  type: string
  system?: string
  items?: string
  custom?: string
}

export interface JiraFieldMetadata {
  required: boolean
  name: string
  schema: JiraFieldSchema
  key?: string
  hasDefaultValue?: boolean
  operations?: string[]
  allowedValues?: Array<{
    id?: string
    name?: string
    value?: string
  }>
}

export interface JiraCreateMetadata {
  projects: Array<{
    id: string
    key: string
    name: string
    issuetypes: Array<{
      id: string
      name: string
      description?: string
      subtask: boolean
      fields: Record<string, JiraFieldMetadata>
    }>
  }>
}
