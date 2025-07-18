import { getChannelListCache } from '../lib/channel-cache.js'

import type { ActivityFeedResponse } from './types.js'

// Helper function to resolve channel ID to name using cache
async function resolveChannelName(channelId: string): Promise<string> {
  try {
    const channels = await getChannelListCache()
    const channel = channels.find((ch) => ch.id === channelId)
    if (channel) {
      // For DMs, show the name as is, for channels add # prefix
      const displayName = channel.is_im || channel.is_mpim ? channel.name : `#${channel.name}`
      return `${displayName} (${channelId})`
    }
    return channelId // Fallback to ID if not found
  } catch (error) {
    console.error('Error resolving channel name:', error)
    return channelId // Fallback to ID on error
  }
}

export async function formatActivityFeed(feed: ActivityFeedResponse): Promise<string> {
  if (!feed.items?.length) return 'No activity found.'

  const formattedItems = await Promise.all(
    feed.items.map(async (item) => {
      switch (item.item.type) {
        case 'thread_v2': {
          const channelName = await resolveChannelName(item.item.bundle_info.payload.thread_entry.channel_id)
          return (
            `Thread: Channel ${channelName}, ` +
            `Unread: ${item.item.bundle_info.payload.thread_entry.unread_msg_count}`
          )
        }
        case 'at_user': {
          const channelName = await resolveChannelName(item.item.message.channel)
          return `Mention: <@${item.item.message.author_user_id}> in channel ${channelName}`
        }
        case 'message_reaction': {
          const channelName = await resolveChannelName(item.item.message.channel)
          return `Reaction: :${item.item.reaction.name}: by <@${item.item.reaction.user}> in channel ${channelName}`
        }
        case 'internal_channel_invite': {
          const channelName = await resolveChannelName(item.item.message.channel)
          return `Channel invite in ${channelName} by <@${item.item.message.author_user_id}>`
        }
        default:
          return 'Other activity'
      }
    }),
  )

  return formattedItems.join('\n')
}

export function formatError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting Slack activity feed: ${msg}`
}
