/**
 * Handler for get-ticket-transitions tool
 * Calls Jira API and returns status code and possible transitions (if available)
 */
import { formatTransitionsResponse, formatTransitionsError } from './formatter.js'
import { getJiraBaseUrl, getJiraToken } from '../lib/jira-env.js'

import type { GetTicketTransitionsParams, JiraTransitionsResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getTicketTransitionsHandler = async (params: GetTicketTransitionsParams): Promise<CallToolResult> => {
  try {
    const url = `${getJiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/transitions`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getJiraToken()}`,
        Accept: 'application/json',
      },
    })
    const status = response.status
    let data: JiraTransitionsResponse | undefined
    try {
      data = (await response.json()) as JiraTransitionsResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatTransitionsResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatTransitionsError(error),
        },
      ],
    }
  }
}
