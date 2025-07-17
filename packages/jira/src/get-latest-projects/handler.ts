/**
 * Handler for get-latest-projects tool
 * Calls Jira API and returns status code and project list (if available)
 */
import { formatProjectsResponse, formatProjectsError } from './formatter.js'
import { getJiraBaseUrl, getJiraToken } from '../lib/jira-env.js'

import type { GetLatestProjectsParams, JiraProjectsListResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getLatestProjectsHandler = async (params: GetLatestProjectsParams): Promise<CallToolResult> => {
  try {
    const maxResults = params.maxResults ?? 10
    const url = `${getJiraBaseUrl()}/rest/api/2/project/search?orderBy=created&maxResults=${maxResults}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getJiraToken()}`,
        Accept: 'application/json',
      },
    })
    const status = response.status
    let data: JiraProjectsListResponse | undefined
    try {
      data = (await response.json()) as JiraProjectsListResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatProjectsResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatProjectsError(error),
        },
      ],
    }
  }
}
