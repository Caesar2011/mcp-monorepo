import { getChannelListCache } from '../lib/channel-cache.js'
import { getSlackEnv } from '../lib/env.js'

import type { Channel, ChannelSection, MappedChannelSection } from './types.js'

/**
 * Fetch channel sections from Slack API and merge with cached channel list and env variables.
 */
export async function fetchChannelSectionsAndList(): Promise<MappedChannelSection[]> {
  const { XOXD_TOKEN, XOXC_TOKEN, TENANT_ID } = getSlackEnv()

  // Prepare cookies & headers
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
  }
  const sectionsUrl = `https://netlight.slack.com/api/users.channelSections.list?slack_route=${TENANT_ID}`

  // Step 1: Fetch channel sections from Slack
  const response = await fetch(sectionsUrl, {
    credentials: 'include',
    headers: {
      ...sharedHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch channel sections')
  }
  const sectionsData = (await response.json()) as { channel_sections: ChannelSection[] }
  if (!sectionsData.channel_sections) {
    throw new Error('No channel_sections in response')
  }

  // Step 2: Load channel list from in-memory cache
  const channels: Channel[] = await getChannelListCache()

  // Step 3: Filter out empty sections and replace channel IDs
  const updatedSections = sectionsData.channel_sections
    .filter((section) => section.channel_ids_page.count > 0)
    .map((section) => ({
      channels: section.channel_ids_page.channel_ids
        .map((id) => channels.find((channel) => channel.id === id))
        .filter(Boolean) as Channel[],
      id: section.channel_section_id,
      name: section.name,
      type: section.type,
      emoji: section.emoji,
    }))

  // Step 4: Find "channels" section and reuse its properties
  const channelsSection = sectionsData.channel_sections.find((section) => section.type === 'channels')
  const usedChannelIds = new Set(updatedSections.flatMap((section) => section.channels.map((channel) => channel.id)))
  const newSection: MappedChannelSection = {
    id: channelsSection?.channel_section_id || 'NEW_SECTION_ID',
    name: channelsSection?.name || 'All Public & Private Channels',
    type: 'channels',
    emoji: channelsSection?.emoji ?? '',
    channels: channels.filter((channel) => !channel.is_im && !channel.is_mpim && !usedChannelIds.has(channel.id)),
  }
  updatedSections.push(newSection)
  return updatedSections
}
