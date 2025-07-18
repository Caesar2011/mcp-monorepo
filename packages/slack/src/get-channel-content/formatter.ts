import type { GetChannelContentResult } from './types.js'

export function formatChannelContent(result: GetChannelContentResult): string {
  if (!result.messages.length) return `No messages in #${result.name || result.channelId}`
  const header = `Channel: #${result.name || result.channelId}`
  return [
    header,
    ...result.messages.map((msg) => {
      let base = `From: ${msg.from ?? 'unknown'} | ${msg.text}`
      if (msg.reactionCount > 0) {
        base += ` | Reactions: ${Object.entries(msg.reactions)
          .map(([k, v]) => `:${k}: ${v}`)
          .join(', ')}`
      }
      if (msg.replies && msg.replies.length > 0) {
        base += `\n Replies:\n ` + msg.replies.map((r) => `${r.user}: ${r.text}`).join('\n ')
      }
      return base
    }),
  ].join('\n\n')
}

export function formatError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting Slack channel content: ${msg}`
}
