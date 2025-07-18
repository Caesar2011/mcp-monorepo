/**
 * Business logic for search-cql tool
 */
import { getConfluenceBaseUrl, getConfluenceToken } from '../lib/confluence-env.js'

import type { SearchCqlParams } from './types.js'

export async function fetchCqlSearch(params: SearchCqlParams): Promise<Response> {
  const cql = encodeURIComponent(params.cqlQuery)
  const limit = params.limit ?? 10
  const start = params.start ?? 0
  const url = `${getConfluenceBaseUrl()}/rest/api/content/search?cql=${cql}&limit=${limit}&start=${start}`
  return fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getConfluenceToken()}`,
      Accept: 'application/json',
    },
  })
}
