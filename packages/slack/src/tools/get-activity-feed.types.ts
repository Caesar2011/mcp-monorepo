// Input for get-activity-feed: no parameters needed yet
export type GetActivityFeedParams = Record<string, never>

export interface ActivityFeedResponse {
  ok: boolean
  items: ActivityItem[]
  response_metadata?: {
    next_cursor?: string
  }
}

export interface ActivityItem {
  is_unread: boolean
  feed_ts: string
  key: string
  item: Item
}

export type Item =
  | ThreadItem
  | AtUserItem
  | MessageReactionItem
  | InternalChannelInviteItem
  | AtChannelItem
  | BotDmBundleItem
  | ListUserMentionedItem

export interface ThreadItem {
  type: 'thread_v2'
  bundle_info: {
    payload: {
      thread_entry: {
        channel_id: string
        latest_ts: string
        thread_ts: string
        unread_msg_count: number
      }
    }
  }
}

export interface AtUserItem {
  type: 'at_user'
  message: {
    ts: string
    channel: string
    is_broadcast: boolean
    thread_ts?: string
    author_user_id: string
  }
}

export interface MessageReactionItem {
  type: 'message_reaction'
  message: {
    ts: string
    channel: string
    thread_ts?: string
  }
  reaction: {
    user: string
    name: string
  }
}

export interface InternalChannelInviteItem {
  type: 'internal_channel_invite'
  message: {
    ts: string
    channel: string
    is_broadcast: boolean
    author_user_id: string
  }
}

export interface AtChannelItem {
  type: 'at_channel'
  message: {
    ts: string
    channel: string
    is_broadcast: boolean
    author_user_id: string
  }
}

export interface BotDmBundleItem {
  type: 'bot_dm_bundle'
  bundle_info: {
    unread_count: number
    payload: {
      message: {
        ts: string
        channel: string
      }
    }
  }
}

export interface ListUserMentionedItem {
  type: 'list_user_mentioned'
  invite: string
  linked_item_id: string
  list_user_mention_payload: {
    list_id: string
    row_id: string
    column_id: string
    mentioned_by: string
  }
}

export interface ActivityFeedItem {
  type: string
  channel?: string
  user?: string
  unreadMessages?: number
  reaction?: string
  invitedBy?: string
  mentionedBy?: string
  taggedBy?: string
  msg?: {
    from: string
    text: string
    reactions: number
  }
  list?: {
    id: string
    row: string
    col: string
  }
}
