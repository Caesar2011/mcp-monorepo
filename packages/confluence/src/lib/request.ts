/**
 * Generic library function for making Confluence API requests
 */
import { logger } from '@mcp-monorepo/shared'

import { getConfluenceBaseUrl, getConfluenceToken } from './confluence-env.js'
import { type ConfluenceErrorResponse } from './types.js'

export interface ConfluenceRequestOptions {
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  queryParams?: Record<string, string | number>
}

/**
 * Generic function to make requests to Confluence API and return typed JSON response
 * @param options - Request configuration options
 * @returns Promise resolving to typed JSON response
 * @throws Error if the request fails or returns non-2xx status
 */
export async function requestConfluence<T>(options: ConfluenceRequestOptions): Promise<T> {
  const { endpoint, method = 'GET', body, headers = {}, queryParams } = options

  const url = new URL(endpoint, getConfluenceBaseUrl())
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
  }

  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${getConfluenceToken()}`,
    Accept: 'application/json',
    ...headers,
  }

  if (body && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  logger.log(url)
  const response = await fetch(url.toString(), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorResponse = await response.json().then(
      (res) => res as ConfluenceErrorResponse,
      () => undefined,
    )
    if (errorResponse) {
      throw new Error(
        `Confluence API request failed: ${response.status} ${errorResponse.message} ${JSON.stringify(errorResponse.data)}`,
      )
    }
    throw new Error(`Confluence API request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}
