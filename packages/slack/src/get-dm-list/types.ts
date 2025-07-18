// Input for get-dm-list: no parameters
export type GetDmListParams = Record<string, never>

export interface SlackUser {
  id: string
  name: string
  real_name: string
  [key: string]: any
}

export interface SlackUserResultsResponse {
  results: SlackUser[]
  can_interact: { [userId: string]: boolean }
  ok: boolean
}

export interface SlackResponse {
  ok: boolean
  ims: SlackIm[]
  mpims: SlackMpim[]
  response_metadata?: {
    next_cursor?: string
  }
}

export interface SlackIm {
  id: string
  message: SlackMessage
  channel: SlackChannel
  latest: string
}

export interface SlackMpim {
  id: string
  message: SlackMessage & {
    edited?: {
      user: string
      ts: string
    }
    reactions?: Reaction[]
  }
  channel: SlackMpimChannel
  latest: string
}

export interface SlackMessage {
  user: string
  type: string
  ts: string
  client_msg_id: string
  text: string
  team: string
  blocks: any[]
  attachments?: any[]
  reactions?: Reaction[]
}

export interface SlackChannel {
  id: string
  created: number
  is_frozen: boolean
  is_archived: boolean
  is_im: boolean
  is_org_shared: boolean
  context_team_id: string
  updated: number
  user: string
  last_read: string
  latest: string
  is_open: boolean
  properties?: {
    tabs?: ChannelTab[]
    tabz?: ChannelTab[]
  }
}

export interface SlackMpimChannel extends SlackChannel {
  name: string
  is_channel: boolean
  is_group: boolean
  is_im: boolean
  is_mpim: boolean
  is_private: boolean
  is_general: boolean
  unlinked: number
  name_normalized: string
  is_shared: boolean
  is_pending_ext_shared: boolean
  pending_shared: any[]
  updated: number
  parent_conversation: string | null
  creator: string
  is_ext_shared: boolean
  shared_team_ids: string[]
  pending_connected_team_ids: string[]
  members: string[]
  topic: {
    value: string
    creator: string
    last_set: number
  }
  purpose: {
    value: string
    creator: string
    last_set: number
  }
  properties?: {
    tabs?: ChannelTab[]
    tabz?: ChannelTab[]
  }
}

export interface ChannelTab {
  type: string
  label?: string
  id?: string
  data?: {
    file_id?: string
    shared_ts?: string
  }
}

export interface Reaction {
  name: string
  users: string[]
  count: number
}

// Output
export type DmOrMpimWithUserDetails =
  | {
      type: 'im'
      channelId: string
      userId: string
      userRealName?: string
      userSlackName?: string
      lastMessage?: {
        text: string
        ts: string
        userId: string
        userRealName?: string
        userSlackName?: string
      }
    }
  | {
      type: 'mpim'
      channelId: string
      members: { userId: string; realName?: string; slackName?: string }[]
      lastMessage?: {
        text: string
        ts: string
        userId: string
        userRealName?: string
        userSlackName?: string
      }
    }

export type GetDmListResult = DmOrMpimWithUserDetails[]
