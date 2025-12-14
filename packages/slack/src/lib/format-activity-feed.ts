import { formatMessageElement } from './formatters.js'
import { fetchMessageByTs } from './message-fetch.js'
import { resolveChannel, resolveUser } from './resolvers.js'

import type { ActivityFeedItem, ActivityFeedResponse } from '../tools/get-activity-feed.types.js'

export async function formatActivityFeed(feed: ActivityFeedResponse): Promise<ActivityFeedItem[]> {
  return await Promise.all(
    feed.items
      .filter((item) => item.is_unread)
      .map(async (item): Promise<ActivityFeedItem> => {
        switch (item.item.type) {
          case 'thread_v2':
            return {
              type: 'New message in thread',
              channel: await resolveChannel(item.item.bundle_info.payload.thread_entry.channel_id),
              unreadMessages: item.item.bundle_info.payload.thread_entry.unread_msg_count,
            }
          case 'at_user':
            return {
              type: 'Mentioned in channel',
              mentionedBy: await resolveUser(item.item.message.author_user_id),
              channel: await resolveChannel(item.item.message.channel),
              msg: await formatMessageElement(await fetchMessageByTs(item.item.message)),
            }
          case 'message_reaction':
            return {
              type: 'New reaction to your message',
              reaction: item.item.reaction.name,
              user: await resolveUser(item.item.reaction.user),
              channel: await resolveChannel(item.item.message.channel),
              msg: await formatMessageElement(await fetchMessageByTs(item.item.message)),
            }
          case 'internal_channel_invite':
            return {
              type: 'Invited to channel',
              channel: await resolveChannel(item.item.message.channel),
              invitedBy: await resolveUser(item.item.message.author_user_id),
            }
          case 'at_channel':
            return {
              type: 'Tagged in channel',
              taggedBy: await resolveUser(item.item.message.author_user_id),
              channel: await resolveChannel(item.item.message.channel),
              msg: await formatMessageElement(await fetchMessageByTs(item.item.message)),
            }
          case 'bot_dm_bundle':
            return {
              type: 'bot_dm_bundle',
              channel: await resolveChannel(item.item.bundle_info.payload.message.channel),
              msg: await formatMessageElement(await fetchMessageByTs(item.item.bundle_info.payload.message)),
            }
          case 'list_user_mentioned':
            return {
              type: 'Mentioned in list',
              mentionedBy: await resolveUser(item.item.list_user_mention_payload.mentioned_by),
              list: {
                id: item.item.list_user_mention_payload.list_id,
                col: item.item.list_user_mention_payload.column_id,
                row: item.item.list_user_mention_payload.row_id,
              },
              // TODO: add resolved list
            }
        }
      }),
  )
}
