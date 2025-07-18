/**
 * Business logic for open-page tool
 */
import { getConfluenceBaseUrl, getConfluenceToken } from '../lib/confluence-env.js'

import type { OpenPageParams } from './types.js'

export async function fetchConfluencePage(params: OpenPageParams): Promise<Response> {
  const url = `${getConfluenceBaseUrl()}/rest/api/content/${encodeURIComponent(params.pageId)}?expand=body.storage`
  return fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getConfluenceToken()}`,
      Accept: 'application/json',
    },
  })
}
