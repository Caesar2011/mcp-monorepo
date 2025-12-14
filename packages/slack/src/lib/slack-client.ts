import * as process from 'node:process'

import { logger } from '@mcp-monorepo/shared'
import { type Logger, WebClient } from '@slack/web-api'
import { type ResponseMetadata } from '@slack/web-api/dist/types/response/UsersConversationsResponse.js'

import { getSlackEnv } from './env.js'

process.env.XOXD_TOKEN =
  'xoxd-jr18zhGSsNkaHfRNIxYb8%2BGLC7E29cwAd%2FxpWcHwx0Mv1%2BFwzIGy3xJJoFyVCGj0H4vHXd6wruGp572TEImktjuvsAJqIEgNaLAO4Vb6%2F7R9v2VdxtTwAuci6CVrMxybTUZUDrP9%2ForZEHgkZ3UtuZjOdvasHoc5vxCgVWbYhC437%2B2DUX%2Bpq9RkROEJN77XlaGBBfGtGQFmArlzCNI0wP0y'
process.env.XOXC_TOKEN =
  'xoxc-2172920488-1684049076881-9186239831959-de3028bca12d5c007ce90ba5c8f2de8647d5af6adcd1c0d84769447093876420'
process.env.TENANT_ID = 'T0252T2EC'

const token = getSlackEnv()
export const slackClient = new WebClient(token.XOXC_TOKEN, {
  slackApiUrl: 'https://netlight.slack.com/api/',
  teamId: token.TENANT_ID,
  logger: logger as Logger,
  requestInterceptor: (config) => {
    config.withCredentials = true
    config.headers['Cookie'] = `d=${token.XOXD_TOKEN}`
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
  const { XOXD_TOKEN, XOXC_TOKEN, TENANT_ID } = getSlackEnv()

  // Prepare cookies & headers
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
  const sectionsUrl = `https://netlight.slack.com/api/${methodName}?slack_route=${TENANT_ID}`

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
  const { XOXD_TOKEN, XOXC_TOKEN, TENANT_ID } = getSlackEnv()

  // Prepare cookies & headers
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
  const sectionsUrl = `https://netlight.slack.com/api/${methodName}?slack_route=${TENANT_ID}`

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
