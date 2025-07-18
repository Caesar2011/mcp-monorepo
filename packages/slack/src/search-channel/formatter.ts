import type { SearchChannelResult } from './types.js'

export function formatSearchChannelResult(res: SearchChannelResult): string {
  if (!res.channels.length) return 'No channels found.'
  return res.channels
    .map((ch) => {
      const priv = ch.is_private ? '🔒' : '#'
      const topic = ch.topic ? ` | topic: ${ch.topic}` : ''
      const purpose = ch.purpose ? ` | purpose: ${ch.purpose}` : ''
      return `${priv}${ch.name}${topic}${purpose}`
    })
    .join('\n')
}

export function formatError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  return `Error searching Slack channels: ${msg}`
}
