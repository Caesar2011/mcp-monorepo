/**
 * Business logic for list-space-pages tool
 */
import { getConfluenceBaseUrl, getConfluenceToken } from '../lib/confluence-env.js'

import type { ListSpacePagesParams } from './types.js'

export async function fetchListSpacePages(params: ListSpacePagesParams): Promise<Response> {
  const limit = params.limit ?? 50
  const start = params.start ?? 0
  const url = `${getConfluenceBaseUrl()}/rest/api/space/${encodeURIComponent(params.spaceKey)}/content/page?limit=${limit}&start=${start}`
  return fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getConfluenceToken()}`,
      Accept: 'application/json',
    },
  })
}
