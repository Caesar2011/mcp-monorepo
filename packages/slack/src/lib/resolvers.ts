import { getChannelListCache } from './channel-cache.js'
import { getMemberListCache } from './user-cache.js'

export async function resolveUser(userId: string | undefined): Promise<string> {
  const userHandle = `<@${userId}>`
  if (!userId) return userHandle
  const users = await getMemberListCache()
  if (!users[userId]) return userHandle
  return `${users[userId].real_name} ${userHandle}`
}

export async function resolveChannel(channelId: string | undefined): Promise<string> {
  const channelHandle = `<#${channelId}>`
  if (!channelId) return channelHandle
  const channels = await getChannelListCache()
  const channel = channels.find((ch) => ch.id === channelId)
  if (!channel) return channelHandle
  if (channel.is_im) return resolveUser(channel.user)
  return `#${channel.name} ${channelHandle}`
}

export async function resolveMessageText(message: string | undefined): Promise<string> {
  if (!message) return ''
  const userIdRegex = /<@(U[A-Z0-9]+)>/g
  const channelIdRegex = /<#([CD][A-Z0-9]+)\|?[^>]*>/g

  const matches = [...Array.from(message.matchAll(userIdRegex)), ...Array.from(message.matchAll(channelIdRegex))]
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const id = match[1]
      const resolved = id.startsWith('U') ? await resolveUser(id) : await resolveChannel(id)
      return {
        original: match,
        resolved,
      }
    }),
  )

  let result = message
  for (const { original, resolved } of replacements.reverse()) {
    result = `${result.substring(0, original.index)}${resolved}${result.substring(original.index + original[0].length)}`
  }

  return result
}
