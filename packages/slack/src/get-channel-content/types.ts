// Input for get-channel-content
export interface GetChannelContentParams {
  channelId: string
}

// Core types from scratch
export interface ConversationViewResponse {
  ok: boolean
  history: {
    messages: ConversationMessage[]
    has_more: boolean
    mutation_timestamps?: {
      latest?: string
      updated?: string
      history_invalid?: string
    }
    channel_actions_ts: string | null
    channel_actions_count: number | null
    next_ts?: number | string
  }
  users: SlackUser[]
  bots: unknown[]
  channels: unknown[]
  emojis: Record<string, string>
  channel: ChannelMeta
  response_metadata?: {
    next_cursor?: string
  }
}

export interface ChannelMeta {
  id: string
  name: string
  is_channel: boolean
  is_private: boolean
  is_member?: boolean
}

export interface ConversationRepliesResponse {
  ok: boolean
  latest_updates: Record<string, string>
  unchanged_messages: string[]
  messages: ConversationReplyMessage[]
  has_more: boolean
}

// Discriminated union for different message types
export type ConversationMessage =
  | UserMessage
  | BotMessage
  | ThreadBroadcastMessage
  | ChannelJoinMessage
  | ChannelLeaveMessage
export type ConversationReplyMessage = UserMessage | BotMessage

export interface BaseMessage {
  type: 'message'
  ts: string
  text?: string
  blocks?: Block[]
  reactions?: Reaction[]
  reply_users?: string[]
  reply_count?: number
  reply_users_count?: number
  latest_reply?: string
  is_locked?: boolean
  subscribed?: boolean
  last_read?: string
}
export interface UserMessage extends BaseMessage {
  subtype?: undefined
  user: string
  client_msg_id: string
  text: string
  thread_ts?: string
  edited?: EditedInfo
}
export interface BotMessage extends BaseMessage {
  subtype: 'bot_message'
  text: string
  bot_id: string
  username: string
  app_id?: string
  user?: undefined
}
export interface ThreadBroadcastMessage extends BaseMessage {
  subtype: 'thread_broadcast'
  user: string
  thread_ts: string
  root?: UserMessage | BotMessage
  text?: string
}
export interface ChannelJoinMessage extends BaseMessage {
  subtype: 'channel_join'
  user: string
  text: string
  inviter?: string
}
export interface ChannelLeaveMessage extends BaseMessage {
  subtype: 'channel_leave'
  user: string
  text: string
}

export interface Block {
  type: string
  block_id?: string
  elements?: BlockElement[]
  text?: PlainText
}
export interface BlockElement {
  type: string
  text?: string
  user_id?: string
}
export interface PlainText {
  type: string
  text: string
  emoji?: boolean
}
export interface Reaction {
  name: string
  users: string[]
  count: number
}
export interface EditedInfo {
  user: string
  ts: string
}

export interface SlackUser {
  id: string
  name: string
  deleted: boolean
  is_bot: boolean
  is_app_user: boolean
  team_id: string
  updated: number
  profile: UserProfile
}

export interface UserProfile {
  real_name: string
  display_name: string
  avatar_hash: string
}

export interface ExtractedMessage {
  from: string | undefined
  text: string
  timestamp: string
  reactionCount: number
  reactions: { [reactionName: string]: number }
  replies?: { user: string | undefined; text: string; timestamp: string }[]
}

export interface GetChannelContentResult {
  channelId: string
  name: string
  messages: ExtractedMessage[]
}
