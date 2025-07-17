/**
 * Handler for get-current-profile tool
 * Calls Jira API and returns status code and response body (if available)
 */

import { getJiraBaseUrl, getJiraToken } from '../lib/jira-env.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getCurrentProfileHandler = async (): Promise<CallToolResult> => {
  try {
    const url = `${getJiraBaseUrl()}/rest/api/2/myself`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getJiraToken()}`,
        Accept: 'application/json',
      },
    })

    const status = response.status
    let body: unknown
    try {
      body = await response.json()
    } catch {
      // ignore if not JSON
    }
    return {
      content: [
        {
          type: 'text',
          text: `HTTP ${status}` + (body ? `\n${JSON.stringify(body, undefined, 2)}` : ''),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    }
  }
}
