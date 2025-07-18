import type { MappedChannelSection } from './types.js'

export function formatChannelSidebar(sections: MappedChannelSection[]): string {
  if (!sections.length) return 'No channels found.'
  return sections
    .map(
      (section) =>
        `Section: ${section.name}\n` +
        section.channels.map((channel) => ` - #${channel.name} (${channel.id})`).join('\n'),
    )
    .join('\n\n')
}

export function formatError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting Slack channel sidebar: ${msg}`
}
