import { getChannelListCache } from '../lib/channel-cache.js'

import type { SearchChannelParams, SearchChannelResult, Channel } from './types.js'

export async function searchChannels({ search }: SearchChannelParams): Promise<SearchChannelResult> {
  const channels = await getChannelListCache()
  const searchLower = search.toLowerCase()
  const matches = channels.filter((ch: Channel) => {
    if (!searchLower) return true
    return (
      ch.name?.toLowerCase().includes(searchLower) ||
      ch.topic?.toLowerCase().includes(searchLower) ||
      ch.purpose?.toLowerCase().includes(searchLower)
    )
  })
  return { channels: matches }
}
