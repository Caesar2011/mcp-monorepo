import type { GetDmListResult } from './types.js'

export function formatDmList(list: GetDmListResult): string {
  if (!list.length) return 'No DMs found.'
  return list
    .map((dm) => {
      if (dm.type === 'im') {
        const who = dm.userRealName || dm.userSlackName || dm.userId
        return `DM with ${who} [${dm.channelId}]${dm.lastMessage ? ` | Last: ${dm.lastMessage.text}` : ''}`
      } else {
        const members = dm.members.map((m) => m.realName || m.slackName || m.userId).join(', ')
        return `Group DM with: ${members} [${dm.channelId}]${dm.lastMessage ? ` | Last: ${dm.lastMessage.text}` : ''}`
      }
    })
    .join('\n')
}

export function formatError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting Slack DM list: ${msg}`
}
