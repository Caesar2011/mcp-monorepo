import { type MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js'

import { resolveMessageText, resolveUser } from './resolvers.js'
import { type AnyChannel } from './types.js'
import { type MessageWithReplies } from '../tools/get-channel-content.types.js'

export async function formatMessageElement(
  msg: MessageElement | undefined,
): Promise<{ from: string; text: string; reactions: number }> {
  if (!msg) return { from: 'unknown', text: 'unknown', reactions: 0 }
  return {
    from: (await resolveUser(msg.user)) ?? 'unknown',
    text: await resolveMessageText(msg.text),
    reactions: msg.reactions?.reduce((acc, reaction) => acc + (reaction.count ?? 0), 0) ?? 0,
  }
}

export async function formatMessage(msg: MessageWithReplies): Promise<object> {
  return {
    ...(await formatMessageElement(msg)),
    replies: msg.replies ? await Promise.all(msg.replies.map(formatMessageElement)) : [],
  }
}

export async function formatChannel(channel: AnyChannel) {
  if (!channel.is_im) {
    return {
      id: channel.id,
      type: channel.is_mpim ? 'direct_group_message' : 'channel',
      is_public: channel.is_private ? 'private' : 'public',
      name: channel.name,
      ...(channel.topic ? { topic: channel.topic } : {}),
      ...(channel.purpose ? { purpose: channel.purpose } : {}),
      ...(channel.is_archived ? { is_archived: true } : {}),
    }
  } else {
    return {
      id: channel.id,
      type: 'direct_message',
      user: channel.user,
      prio: channel.priority,
    }
  }
}

export function formatStatement(string: string) {
  return {
    message: string,
  }
}

export function formatError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting Slack channel content: ${msg}`
}
