/**
 * Handler for set-issue-status tool
 * Transitions a Jira issue to a new status
 */
import { formatSetIssueStatusResponse, formatSetIssueStatusError } from './formatter.js'
import { getJiraBaseUrl, getJiraToken } from '../lib/jira-env.js'

import type { SetIssueStatusParams, JiraTransitionsResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

async function getTransitionIdForStatus(issueIdOrKey: string, status: string): Promise<string | undefined> {
  const url = `${getJiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(issueIdOrKey)}/transitions`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getJiraToken()}`,
      Accept: 'application/json',
    },
  })
  const data = (await response.json()) as JiraTransitionsResponse
  const found = data.transitions.find((t) => t.to.name.toLowerCase() === status.toLowerCase())
  return found?.id
}

export const setIssueStatusHandler = async (params: SetIssueStatusParams): Promise<CallToolResult> => {
  try {
    let transitionId = params.transitionId
    if (!transitionId && params.status) {
      transitionId = await getTransitionIdForStatus(params.issueIdOrKey, params.status)
      if (!transitionId) {
        throw new Error(`No transition found for status: ${params.status}`)
      }
    }
    if (!transitionId) {
      throw new Error('Either transitionId or status must be provided')
    }
    const url = `${getJiraBaseUrl()}/rest/api/2/issue/${encodeURIComponent(params.issueIdOrKey)}/transitions`
    const body: Record<string, unknown> = { transition: { id: transitionId } }
    if (params.comment) {
      body.update = {
        comment: [
          {
            add: {
              body: params.comment,
            },
          },
        ],
      }
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
    return {
      content: [
        {
          type: 'text',
          text: formatSetIssueStatusResponse(response.status, response.ok, params.status),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatSetIssueStatusError(error),
        },
      ],
    }
  }
}
