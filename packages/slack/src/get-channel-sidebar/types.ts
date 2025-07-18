// Input for get-channel-sidebar: none needed, but define for future
export type GetChannelSidebarParams = Record<string, never>

// Unified Channel type that includes all properties needed across modules
export interface Channel {
  id: string
  name: string
  topic: string
  purpose: string
  is_member: boolean
  is_private: boolean
  is_im: boolean
  is_mpim: boolean
  is_channel: boolean
  is_archived: boolean
  num_members?: number
  members?: string[]
  pinned_items?: unknown[]
}
export interface ChannelSection {
  channel_section_id: string
  name: string
  type: string
  emoji: string
  channel_ids_page: {
    channel_ids: string[]
    count: number
    cursor?: string
  }
}
export interface MappedChannelSection {
  id: string
  name: string
  type: string
  emoji: string
  channels: Channel[]
}

// Output
export type GetChannelSidebarResult = MappedChannelSection[]
