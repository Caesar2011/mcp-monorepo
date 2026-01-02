import { logger } from '@mcp-monorepo/shared'
import { type Logger, WebClient } from '@slack/web-api'
import { type ResponseMetadata } from '@slack/web-api/dist/types/response/UsersConversationsResponse.js'

import { getSlackEnv } from './env.js'

// Get all env vars once at the module level
const { SLACK_WORKSPACE_URL, XOXC_TOKEN, XOXD_TOKEN, TENANT_ID } = getSlackEnv()
const slackApiUrl = `${SLACK_WORKSPACE_URL}/api/`

export const slackClient = new WebClient(XOXC_TOKEN, {
  slackApiUrl,
  teamId: TENANT_ID,
  logger: logger as Logger,
  requestInterceptor: (config) => {
    config.withCredentials = true
    config.headers['Cookie'] = `d=${XOXD_TOKEN}`
    return config
  },
})

export async function* paginate<P extends { cursor?: string }, T extends { response_metadata?: ResponseMetadata }>(
  cb: (props: P) => Promise<T>,
  props: P,
) {
  const { response_metadata, ...other } = await cb({ ...props } as P)
  yield other
  let cursor = response_metadata?.next_cursor
  let count = 4
  while (cursor) {
    const { response_metadata, ...other } = await cb({ ...props, cursor } as P)
    yield other
    cursor = response_metadata?.next_cursor
    if (--count < 1) break
  }
}

export async function runSlackGet<T>(methodName: string): Promise<T> {
  const cookies = `d=${XOXD_TOKEN}`
  const sharedHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    Accept: '*/*',
    'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Cookie: cookies,
    Authorization: `Bearer ${XOXC_TOKEN}`,
  }
  const sectionsUrl = `${slackApiUrl}${methodName}?slack_route=${TENANT_ID}`

  const response = await fetch(sectionsUrl, {
    credentials: 'include',
    headers: {
      ...sharedHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${methodName}`)
  }

  return (await response.json()) as Promise<T>
}

export async function runSlackPost<T>(methodName: string, body: URLSearchParams): Promise<T> {
  const cookies = `d=${XOXD_TOKEN}`
  const sharedHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    Accept: '*/*',
    'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Cookie: cookies,
    Authorization: `Bearer ${XOXC_TOKEN}`,
  }
  const sectionsUrl = `${slackApiUrl}${methodName}?slack_route=${TENANT_ID}`

  const response = await fetch(sectionsUrl, {
    credentials: 'include',
    headers: {
      ...sharedHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
    body: body.toString(),
    mode: 'cors',
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${methodName}`)
  }

  return (await response.json()) as Promise<T>
}
