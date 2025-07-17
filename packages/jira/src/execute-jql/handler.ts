/**
 * Handler for execute-jql tool
 * Calls Jira search API and returns status code and issues (if available)
 */
import { formatJqlResponse, formatJqlError } from './formatter.js'
import { getJiraBaseUrl, getJiraToken } from '../lib/jira-env.js'

import type { ExecuteJqlParams, JiraJqlResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const executeJqlHandler = async (params: ExecuteJqlParams): Promise<CallToolResult> => {
  try {
    const url = `${getJiraBaseUrl()}/rest/api/2/search`
    const body = {
      jql: params.jql,
      maxResults: params.maxResults ?? 50,
      startAt: params.startAt ?? 0,
      fields: params.fields ?? ['summary', 'status', 'assignee'],
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getJiraToken()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    const status = response.status
    let data: JiraJqlResponse | undefined
    try {
      data = (await response.json()) as JiraJqlResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatJqlResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatJqlError(error),
        },
      ],
    }
  }
}
