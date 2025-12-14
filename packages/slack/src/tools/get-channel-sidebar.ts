import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getChannelListCache } from '../lib/channel-cache.js'
import { formatChannel } from '../lib/formatters.js'
import { runSlackGet } from '../lib/slack-client.js'

import type { ChannelSection, SlackChannelSectionResponse } from './get-channel-sidebar.types.js'
import type { AnyChannel } from '../lib/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetChannelSidebarTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-channel-sidebar',
    title: 'Get Channel Sidebar',
    description: 'Returns a Slack-style list of channels by sidebar section.',
    inputSchema: {},
    outputSchema: {
      sections: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
          emoji: z.string().optional(),
          channels: z.array(z.unknown()),
        }),
      ),
      total: z.number(),
    },
    isReadOnly: true,
    async fetcher() {
      // Fetch channel sections from Slack API
      const sectionsData = await runSlackGet<SlackChannelSectionResponse>('users.channelSections.list')

      if (!sectionsData.ok || !sectionsData.channel_sections) {
        throw new Error('No channel_sections in response')
      }

      // Load channel list from in-memory cache
      const channels = await getChannelListCache()

      // Filter out empty sections and replace channel IDs
      const updatedSections: ChannelSection[] = sectionsData.channel_sections
        .filter((section) => section.channel_ids_page.count > 0)
        .map((section) => ({
          channels: section.channel_ids_page.channel_ids
            .map((id) => channels.find((channel) => channel.id === id))
            .filter(Boolean) as AnyChannel[],
          id: section.channel_section_id,
          name: section.name,
          type: section.type,
          emoji: section.emoji,
        }))

      // Find "channels" section and reuse its properties
      const channelsSection = sectionsData.channel_sections.find((section) => section.type === 'channels')
      const usedChannelIds = new Set(
        updatedSections.flatMap((section) => section.channels.map((channel) => channel.id)),
      )
      const newSection: ChannelSection = {
        id: channelsSection?.channel_section_id || 'NEW_SECTION_ID',
        name: channelsSection?.name || 'All Public & Private Channels',
        type: 'channels',
        emoji: channelsSection?.emoji,
        channels: channels.filter((channel) => !channel.is_im && !channel.is_mpim && !usedChannelIds.has(channel.id)),
      }
      updatedSections.push(newSection)

      return updatedSections
    },
    async formatter(sections) {
      const formattedSections = await Promise.all(
        sections.map(async (section) => ({
          id: section.id,
          name: section.name,
          type: section.type,
          emoji: section.emoji,
          channels: await Promise.all(section.channels.map(formatChannel)),
        })),
      )

      return {
        sections: formattedSections,
        total: sections.length,
      }
    },
  })
