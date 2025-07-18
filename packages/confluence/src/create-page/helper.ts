/**
 * Business logic for create-page tool
 */
import { getConfluenceBaseUrl, getConfluenceToken } from '../lib/confluence-env.js'

import type { CreatePageParams } from './types.js'

export async function fetchCreatePage(params: CreatePageParams): Promise<Response> {
  const requestBody: Record<string, unknown> = {
    type: 'page',
    title: params.title,
    space: { key: params.spaceKey },
    body: {
      storage: {
        value: params.content,
        representation: 'storage',
      },
    },
  }
  if (params.parentId) {
    requestBody.ancestors = [{ id: params.parentId }]
  }
  return fetch(`${getConfluenceBaseUrl()}/rest/api/content`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getConfluenceToken()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
}
