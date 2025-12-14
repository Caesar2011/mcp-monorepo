import { type FieldMessage } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js'

import { type Channel, type IM, type MpIM } from '../lib/types.js'

// Specific conversation item types
export interface ImConversationItem {
  id: string
  message?: FieldMessage
  channel: IM
  latest: string
}

export interface MpimConversationItem {
  id: string
  message?: FieldMessage
  channel: MpIM | Channel
  latest: string
}

export interface ResponseMetadata {
  next_cursor: string
}

// Main interface with strict typing for IMs and MPIMs
export interface SlackDmResponse {
  ok: boolean
  ims?: ImConversationItem[]
  mpims?: MpimConversationItem[]
  response_metadata?: ResponseMetadata
}
