import { paginate, slackClient } from './slack-client.js'
import { type AnyChannel } from './types.js'

let channelsPromise: Promise<AnyChannel[]> | undefined

// Fetch channel list from Slack API (as in original helper, but only once)
async function fetchChannelsFromSlack(): Promise<AnyChannel[]> {
  const channels: AnyChannel[] = []

  for await (const list of paginate(slackClient.users.conversations, {})) {
    if (list.channels) {
      channels.push(
        ...(list.channels.filter((channel) => !channel.is_archived && !channel.is_user_deleted) as AnyChannel[]),
      )
    }
  }

  return channels
}

/**
 * Loads the channels list into the in-memory cache on first call (or returns existing).
 * Use this as the single source of truth for channel info!
 */
export function getChannelListCache(): Promise<AnyChannel[]> {
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
