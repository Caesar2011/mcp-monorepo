import { type ConversationsInfoResponse } from '@slack/web-api'
import { type MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js'

export type ConversationInfo = ConversationsInfoResponse & { messages: MessageElement[] }
export type MessageWithReplies = MessageElement & { replies: MessageElement[] }
export type ConversationInfoWithReplies = ConversationsInfoResponse & { messages: MessageWithReplies[] }
