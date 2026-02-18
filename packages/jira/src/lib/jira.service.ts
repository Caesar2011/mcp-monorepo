import { getJiraAuthMode, getJiraBaseUrl } from './jira-env.js'

import type {
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
  return jiraRequest<JiraIssue>(`/rest/api/2/issue/${issueIdOrKey}?${params.toString()}`)
}

export const executeJql = (jql: string, maxResults = 50, startAt = 0, fields?: string[]) => {
  return jiraRequest<JiraJqlResponse>('/rest/api/2/search', {
    method: 'POST',
    body: JSON.stringify({ jql, maxResults, startAt, fields: fields ?? ['summary', 'status', 'assignee'] }),
  })
}

export const getLatestProjects = (maxResults = 10) => {
  return jiraRequest<JiraProjectsListResponse>(`/rest/api/2/project/search?orderBy=created&maxResults=${maxResults}`)
}

export const getCurrentProfile = () => {
  return jiraRequest<JiraProfileResponse>('/rest/api/2/myself')
}

export const getTicketTransitions = (issueIdOrKey: string) => {
  return jiraRequest<JiraTransitionsResponse>(`/rest/api/2/issue/${issueIdOrKey}/transitions`)
}

export const setIssueStatus = async (issueIdOrKey: string, transitionId: string, comment?: string) => {
  const body: Record<string, unknown> = { transition: { id: transitionId } }
  if (comment) {
    body.update = { comment: [{ add: { body: comment } }] }
  }
  await jiraRequest<void>(`/rest/api/2/issue/${issueIdOrKey}/transitions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const findTransitionIdByName = async (issueIdOrKey: string, statusName: string): Promise<string | undefined> => {
  const response = await getTicketTransitions(issueIdOrKey)
  const transition = response.transitions.find((t) => t.to.name.toLowerCase() === statusName.toLowerCase())
  return transition?.id
}
