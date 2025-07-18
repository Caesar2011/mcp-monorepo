import { getChannelListCache } from '../lib/channel-cache.js'

import type { GetChannelInfoParams, SlackChannelInfoResponse } from './types.js'

export async function fetchChannelInfo({ channelId }: GetChannelInfoParams): Promise<SlackChannelInfoResponse> {
  const channels = await getChannelListCache()
  const channel = channels.find((ch) => ch.id === channelId)
  if (!channel) {
    throw new Error(`Channel with id ${channelId} not found in cache`)
  }
  return { ok: true, channel }
}
