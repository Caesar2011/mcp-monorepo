import { getSlackEnv } from '../lib/env.js'

import type {
  GetChannelContentParams,
  ConversationViewResponse,
  ConversationRepliesResponse,
  ExtractedMessage,
  ConversationMessage,
  ConversationReplyMessage,
  GetChannelContentResult,
} from './types.js'

async function convertMessageToSummary(
  message: ConversationMessage,
  replyMessages: ConversationReplyMessage[],
): Promise<ExtractedMessage> {
  const from = 'user' in message ? message.user : undefined
  const text = message.text || ''
  const timestamp = message.ts
  const reactionCount = message.reactions?.reduce((acc, reaction) => acc + reaction.count, 0) || 0
  const reactions: { [reactionName: string]: number } = {}
  message.reactions?.forEach((reaction) => {
    reactions[reaction.name] = reaction.count
  })
  const replies = replyMessages.map((reply) => ({
    user: reply.user,
    text: reply.text || '',
    timestamp: reply.ts,
  }))
  return {
    from,
    text,
    timestamp,
    reactionCount,
    reactions,
    replies: replies.length ? replies : [],
  }
}

export async function fetchChannelContent({ channelId }: GetChannelContentParams): Promise<GetChannelContentResult> {
  const { XOXD_TOKEN, XOXC_TOKEN, TENANT_ID } = getSlackEnv()
  const cookies = `d=${XOXD_TOKEN}`
  const sharedHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    Accept: '*/*',
    'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Cookie: cookies,
    Authorization: `Bearer ${XOXC_TOKEN}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  // Get channel content (messages)
  const historyRes = await fetch(`https://netlight.slack.com/api/conversations.view?slack_route=${TENANT_ID}`, {
    credentials: 'include',
    headers: sharedHeaders,
    method: 'POST',
    body: new URLSearchParams({
      canonical_avatars: 'true',
      no_user_profile: 'true',
      ignore_replies: 'true',
      no_self: 'true',
      include_full_users: 'true',
      include_use_case: 'true',
      include_stories: 'true',
      no_members: 'true',
      include_mutation_timestamps: 'true',
      count: '28',
      include_free_team_extra_messages: 'true',
      channel: channelId,
    }).toString(),
    mode: 'cors',
  })
  if (!historyRes.ok) {
    throw new Error('Failed to fetch channel messages')
  }
  const historyData = (await historyRes.json()) as ConversationViewResponse
  // For each message, if it has replies, fetch those
  const messages: ExtractedMessage[] = []
  for (const msg of historyData.history.messages) {
    let replyMessages: ConversationReplyMessage[] = []
    if (msg.reply_count) {
      const repliesRes = await fetch(`https://netlight.slack.com/api/conversations.replies?slack_route=${TENANT_ID}`, {
        credentials: 'include',
        headers: sharedHeaders,
        method: 'POST',
        body: new URLSearchParams({
          channel: channelId,
          ts: msg.ts,
          inclusive: 'true',
          limit: '28',
        }).toString(),
        mode: 'cors',
      })
      if (repliesRes.ok) {
        const repliesData = (await repliesRes.json()) as ConversationRepliesResponse
        replyMessages = repliesData.messages ?? []
      }
    }
    messages.push(await convertMessageToSummary(msg, replyMessages))
  }
  return {
    channelId,
    name: historyData.channel?.name || '',
    messages,
  }
}
