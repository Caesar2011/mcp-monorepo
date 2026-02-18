import { mdToAdf } from './adf-utils.js'
import { getJiraApiVersion, getJiraAuthMode, getJiraBaseUrl } from './jira-env.js'

import type {
  JiraComment,
  JiraCreateIssueResponse,
  JiraCreateMetadata,
  JiraEnhancedJqlResponse,
  JiraIssue,
  JiraJqlResponse,
  JiraProfileResponse,
  JiraProjectsListResponse,
  JiraTransitionsResponse,
} from './types.js'

function buildAuthHeaders(): Record<string, string> {
  const auth = getJiraAuthMode()
  if (auth.type === 'token') {
    return { Authorization: `Bearer ${auth.value}` }
  }
  return { Cookie: auth.value }
}

function buildApiPath(endpoint: string): string {
  const version = getJiraApiVersion()
  return `/rest/api/${version}${endpoint}`
}

async function jiraRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = new URL(endpoint, getJiraBaseUrl())
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      ...buildAuthHeaders(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let enhancedError = `Jira API request failed with status ${response.status}: ${errorText}`

    // Parse error and add helpful context
    try {
      const errorJson = JSON.parse(errorText) as {
        errorMessages?: string[]
        errors?: Record<string, string>
      }

      if (errorJson.errors && Object.keys(errorJson.errors).length > 0) {
        enhancedError += '\n\nMissing or invalid fields:'
        Object.entries(errorJson.errors).forEach(([field, message]) => {
          enhancedError += `\n  - ${field}: ${message}`
        })
        enhancedError += '\n\nTip: Use "get-create-metadata" tool to see available fields and requirements.'
      }

      if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
        enhancedError += '\n\nError messages:'
        errorJson.errorMessages.forEach((msg) => {
          enhancedError += `\n  - ${msg}`
        })
      }
    } catch {
      // If JSON parsing fails, use original error text
    }

    throw new Error(enhancedError)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as T
}

export const getIssue = (issueIdOrKey: string, fields?: string[], expand?: string[]) => {
  const params = new URLSearchParams()
  if (fields) params.set('fields', fields.join(','))
  if (expand) params.set('expand', expand.join(','))
  return jiraRequest<JiraIssue>(`${buildApiPath(`/issue/${issueIdOrKey}`)}?${params.toString()}`)
}

/**
 * Execute JQL search using enhanced search endpoint (v3) or legacy search (v2)
 * In v3, uses /rest/api/3/search/jql with nextPageToken pagination
 * In v2, uses /rest/api/2/search with startAt pagination
 */
export const executeJql = (jql: string, maxResults = 50, startAt = 0, fields?: string[], nextPageToken?: string) => {
  const apiVersion = getJiraApiVersion()

  if (apiVersion === '3') {
    // Use enhanced search endpoint in v3
    return jiraRequest<JiraEnhancedJqlResponse>(buildApiPath('/search/jql'), {
      method: 'POST',
      body: JSON.stringify({
        jql,
        maxResults,
        fields: fields ?? ['summary', 'status', 'assignee'],
        ...(nextPageToken && { nextPageToken }),
      }),
    })
  } else {
    // Use legacy search endpoint in v2
    return jiraRequest<JiraJqlResponse>(buildApiPath('/search'), {
      method: 'POST',
      body: JSON.stringify({ jql, maxResults, startAt, fields: fields ?? ['summary', 'status', 'assignee'] }),
    })
  }
}

export const getLatestProjects = (maxResults = 10) => {
  return jiraRequest<JiraProjectsListResponse>(
    `${buildApiPath('/project/search')}?orderBy=created&maxResults=${maxResults}`,
  )
}

export const getCurrentProfile = () => {
  return jiraRequest<JiraProfileResponse>(buildApiPath('/myself'))
}

export const getTicketTransitions = (issueIdOrKey: string) => {
  return jiraRequest<JiraTransitionsResponse>(buildApiPath(`/issue/${issueIdOrKey}/transitions`))
}

export const setIssueStatus = async (issueIdOrKey: string, transitionId: string, comment?: string) => {
  const body: Record<string, unknown> = { transition: { id: transitionId } }
  if (comment) {
    body.update = { comment: [{ add: { body: comment } }] }
  }
  await jiraRequest<void>(buildApiPath(`/issue/${issueIdOrKey}/transitions`), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const findTransitionIdByName = async (issueIdOrKey: string, statusName: string): Promise<string | undefined> => {
  const response = await getTicketTransitions(issueIdOrKey)
  const transition = response.transitions.find((t) => t.to.name.toLowerCase() === statusName.toLowerCase())
  return transition?.id
}

export const getCreateMetadata = async (projectKey?: string, issueTypeId?: string) => {
  const params = new URLSearchParams()
  if (projectKey) params.set('projectKeys', projectKey)
  if (issueTypeId) params.set('issuetypeIds', issueTypeId)
  params.set('expand', 'projects.issuetypes.fields')

  return jiraRequest<JiraCreateMetadata>(`${buildApiPath('/issue/createmeta')}?${params.toString()}`)
}

export const createIssue = async (params: {
  projectKey: string
  issueTypeId: string
  summary: string
  description?: string
  assigneeId?: string
  priorityId?: string
  labels?: string[]
  parentKey?: string
}): Promise<JiraCreateIssueResponse> => {
  const apiVersion = getJiraApiVersion()

  const body: Record<string, unknown> = {
    fields: {
      project: { key: params.projectKey },
      issuetype: { id: params.issueTypeId },
      summary: params.summary,
    },
  }

  // Description: Markdown → ADF if v3, String if v2
  if (params.description) {
    if (apiVersion === '3') {
      const adf = mdToAdf(params.description)
      if (adf) {
        ;(body.fields as Record<string, unknown>).description = adf
      }
    } else {
      ;(body.fields as Record<string, unknown>).description = params.description
    }
  }

  // Assignee: accountId works in both v2 and v3
  if (params.assigneeId) {
    ;(body.fields as Record<string, unknown>).assignee = { id: params.assigneeId }
  }

  if (params.priorityId) {
    ;(body.fields as Record<string, unknown>).priority = { id: params.priorityId }
  }

  if (params.labels && params.labels.length > 0) {
    ;(body.fields as Record<string, unknown>).labels = params.labels
  }

  // Parent for subtasks
  if (params.parentKey) {
    ;(body.fields as Record<string, unknown>).parent = { key: params.parentKey }
  }

  return jiraRequest<JiraCreateIssueResponse>(buildApiPath('/issue'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const updateIssue = async (
  issueIdOrKey: string,
  updates: {
    summary?: string
    description?: string
    assigneeId?: string | null
    priorityId?: string
    labels?: string[]
  },
): Promise<void> => {
  const apiVersion = getJiraApiVersion()
  const fields: Record<string, unknown> = {}

  if (updates.summary !== undefined) {
    fields.summary = updates.summary
  }

  if (updates.description !== undefined) {
    if (apiVersion === '3') {
      const adf = mdToAdf(updates.description)
      if (adf) {
        fields.description = adf
      }
    } else {
      fields.description = updates.description
    }
  }

  // Assignee: null means unassign, accountId works in both v2 and v3
  if (updates.assigneeId !== undefined) {
    // eslint-disable-next-line no-restricted-syntax
    fields.assignee = updates.assigneeId ? { id: updates.assigneeId } : null
  }

  if (updates.priorityId !== undefined) {
    fields.priority = { id: updates.priorityId }
  }

  if (updates.labels !== undefined) {
    fields.labels = updates.labels
  }

  await jiraRequest<void>(buildApiPath(`/issue/${issueIdOrKey}`), {
    method: 'PUT',
    body: JSON.stringify({ fields }),
  })
}

export const addComment = async (
  issueIdOrKey: string,
  commentText: string,
  visibility?: { type: 'role' | 'group'; value: string },
): Promise<JiraComment> => {
  const apiVersion = getJiraApiVersion()

  const body: Record<string, unknown> = {
    body: apiVersion === '3' ? mdToAdf(commentText) : commentText,
  }

  if (visibility) {
    body.visibility = visibility
  }

  return jiraRequest<JiraComment>(buildApiPath(`/issue/${issueIdOrKey}/comment`), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
