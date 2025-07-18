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

export type Item = ThreadItem | AtUserItem | MessageReactionItem | InternalChannelInviteItem

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
