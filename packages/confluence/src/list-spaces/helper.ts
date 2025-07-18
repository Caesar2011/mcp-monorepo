/**
 * Business logic for list-spaces tool
 */
import { getConfluenceBaseUrl, getConfluenceToken } from '../lib/confluence-env.js'

import type { ListSpacesParams } from './types.js'

export async function fetchListSpaces(params: ListSpacesParams): Promise<Response> {
  const limit = params.limit ?? 50
  const start = params.start ?? 0
  const url = `${getConfluenceBaseUrl()}/rest/api/space?limit=${limit}&start=${start}`
  return fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getConfluenceToken()}`,
      Accept: 'application/json',
    },
  })
}
