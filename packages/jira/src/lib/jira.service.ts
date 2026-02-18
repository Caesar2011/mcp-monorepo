import { getJiraApiVersion, getJiraAuthMode, getJiraBaseUrl } from './jira-env.js'

import type {
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
    throw new Error(`Jira API request failed with status ${response.status}: ${errorText}`)
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
