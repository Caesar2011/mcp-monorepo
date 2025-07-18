/**
 * Business logic for update-page tool
 */
import { getConfluenceBaseUrl, getConfluenceToken } from '../lib/confluence-env.js'

import type { UpdatePageParams } from './types.js'

export async function fetchUpdatePage(params: UpdatePageParams): Promise<Response> {
  const requestBody: Record<string, unknown> = {
    id: params.pageId,
    type: 'page',
    title: params.newTitle,
    version: {
      number: params.currentVersionNumber + 1,
    },
    body: {
      storage: {
        value: params.newContent,
        representation: 'storage',
      },
    },
  }
  return fetch(`${getConfluenceBaseUrl()}/rest/api/content/${encodeURIComponent(params.pageId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getConfluenceToken()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
}
