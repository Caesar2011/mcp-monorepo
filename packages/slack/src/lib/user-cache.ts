import { logger } from '@mcp-monorepo/shared'
import { type Member } from '@slack/web-api/dist/types/response/UsersListResponse.js'

import { paginate, slackClient } from './slack-client.js'

let membersPromise: Promise<Record<string, Member>> | undefined

// Fetch channel list from Slack API (as in original helper, but only once)
async function fetchMembersFromSlack(): Promise<Record<string, Member>> {
  const members: Member[] = []

  for await (const list of paginate(slackClient.users.list, {})) {
    if (list.members) {
      members.push(...list.members)
    }
  }
  logger.info('Fetching users completed!')

  return Object.fromEntries(members.map((member) => [member.id, member])) as Record<string, Member>
}

/**
 * Loads the channels list into the in-memory cache on first call (or returns existing).
 * Use this as the single source of truth for channel info!
 */
export function getMemberListCache(): Promise<Record<string, Member>> {
  if (!membersPromise) {
    membersPromise = fetchMembersFromSlack()
  }
  return membersPromise
}

/**
 * Call this early on startup to pre-warm the cache!
 */
export async function preloadMemberListCache(): Promise<void> {
  await getMemberListCache()
}
