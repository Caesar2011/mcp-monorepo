import type { SlackChannelInfoResponse } from './types.js'

export function formatChannelInfo(res: SlackChannelInfoResponse): string {
  if (!res.channel) return 'No channel info found.'
  const c = res.channel
  const priv = c.is_private ? '🔒' : '#'
  const props = [
    `${priv}${c.name}`,
    c.is_member ? 'joined' : 'not joined',
    c.is_archived ? 'archived' : '',
    c.topic ? `topic: ${c.topic}` : '',
    c.purpose ? `purpose: ${c.purpose}` : '',
    c.num_members ? `members: ${c.num_members}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
  return props
}

export function formatError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting Slack channel info: ${msg}`
}
