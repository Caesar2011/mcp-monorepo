import { type AnyChannel } from '../lib/types.js'

export type SectionType =
  | 'salesforce_records'
  | 'slack_connect'
  | 'stars'
  | 'standard'
  | 'channels'
  | 'direct_messages'
  | 'recent_apps'
  | 'agents'

export interface ChannelSection {
  id: string
  name: string
  type: SectionType
  emoji: string | undefined
  channels: AnyChannel[]
}

export interface SlackChannelSectionResponse {
  ok: boolean
  channel_sections: {
    channel_section_id: string
    name: string
    type: SectionType
    emoji: string
    next_channel_section_id: string | null
    last_updated: number
    channel_ids_page: {
      channel_ids: string[]
      count: number
      cursor?: string
    }
    is_redacted: boolean
  }[]
  last_updated: number
  count: number
  cursor: string
}
