import type { Channel } from '../get-channel-sidebar/types.js'

// Input for get-channel-info
export interface GetChannelInfoParams {
  channelId: string
}

export interface SlackChannelInfoResponse {
  ok: boolean
  channel: Channel
}
