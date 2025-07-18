import { getSlackEnv } from './env.js'
import { type Channel } from '../get-channel-sidebar/types.js'

let channelsPromise: Promise<Channel[]> | undefined

// Fetch channel list from Slack API (as in original helper, but only once)
async function fetchChannelsFromSlack(): Promise<Channel[]> {
  const { XOXD_TOKEN, XOXC_TOKEN, TENANT_ID } = getSlackEnv()
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
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  let cursor: string | undefined = undefined
  const channels: Channel[] = []
  let requestCount = 0
  const MAX_REQUESTS = 50

  do {
    const response = await fetch('https://slack.com/api/users.conversations', {
      credentials: 'include',
      headers: sharedHeaders,
      body: new URLSearchParams({
        exclude_archived: 'false',
        limit: '999',
        teamId: TENANT_ID,
        types: 'public_channel,private_channel,im,mpim',
        ...(cursor ? { cursor } : {}),
      }).toString(),
      method: 'POST',
      mode: 'cors',
    })

    const dmResponse = (await response.json()) as {
      ok: boolean
      channels: Array<{
        id: string
        name: string
        topic?: { value: string }
        purpose?: { value: string }
        is_member: boolean
        is_private: boolean
        is_im: boolean
        is_mpim: boolean
        user?: string
        is_user_deleted?: boolean
        is_archived?: boolean
      }>
      response_metadata?: { next_cursor?: string }
    }

    if (!dmResponse.ok) {
      console.error('Error fetching channels', dmResponse)
      break
    }

    // Filter required fields and map to Channel type
    channels.push(
      ...dmResponse.channels
        .filter((channel) => !channel.is_user_deleted && !channel.is_archived)
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          topic: channel.topic?.value || '',
          purpose: channel.purpose?.value || '',
          is_member: channel.is_member,
          is_private: channel.is_private,
          is_im: channel.is_im,
          is_mpim: channel.is_mpim,
          is_channel: !channel.is_im && !channel.is_mpim,
          is_archived: channel.is_archived || false,
        })),
    )

    cursor = dmResponse.response_metadata?.next_cursor
    requestCount++
  } while (cursor && requestCount < MAX_REQUESTS)

  return channels
}

/**
 * Loads the channels list into the in-memory cache on first call (or returns existing).
 * Use this as the single source of truth for channel info!
 */
export function getChannelListCache(): Promise<Channel[]> {
  if (!channelsPromise) {
    channelsPromise = fetchChannelsFromSlack()
  }
  return channelsPromise
}

/**
 * Call this early on startup to pre-warm the cache!
 */
export async function preloadChannelListCache(): Promise<void> {
  await getChannelListCache()
}
