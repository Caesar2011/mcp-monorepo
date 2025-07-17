/**
 * Handler for get-issue tool
 * Calls Jira API and returns status code and issue details (if available)
 */
import { formatIssueResponse, formatIssueError } from './formatter.js'
import { getJiraBaseUrl, getJiraToken } from '../lib/jira-env.js'

import type { GetIssueParams, JiraIssue } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getIssueHandler = async (params: GetIssueParams): Promise<CallToolResult> => {
  try {
    const url = new URL(`${getJiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}`)
    if (params.fields) url.searchParams.set('fields', params.fields.join(','))
    if (params.expand) url.searchParams.set('expand', params.expand.join(','))

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${getJiraToken()}`,
        Accept: 'application/json',
      },
    })
    const status = response.status
    let data: JiraIssue | undefined
    try {
      data = (await response.json()) as JiraIssue
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatIssueResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatIssueError(error),
        },
      ],
    }
  }
}
