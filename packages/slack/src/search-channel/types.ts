import type { Channel } from '../get-channel-sidebar/types.js'

export type { Channel }

export interface SearchChannelParams {
  search: string
}

export interface SearchChannelResult {
  channels: Channel[]
}
