import { getSlackEnv } from '../lib/env.js'

import type { SlackResponse, SlackUserResultsResponse, DmOrMpimWithUserDetails, SlackUser } from './types.js'

function getUserMap(users: SlackUser[]): Record<string, SlackUser> {
  return users.reduce(
    (map, user) => {
      map[user.id] = user
      return map
    },
    {} as Record<string, SlackUser>,
  )
}

function getAllUserIdsToFetch(dmResponse: SlackResponse): string[] {
  const ids = new Set<string>()
  dmResponse.ims.forEach((im) => {
    if (im.channel && im.channel.user) ids.add(im.channel.user)
    if (im.message && im.message.user) ids.add(im.message.user)
  })
  dmResponse.mpims?.forEach((mpim) => {
    if (mpim.channel && Array.isArray(mpim.channel.members)) {
      mpim.channel.members.forEach((id) => ids.add(id))
    }
    if (mpim.message && mpim.message.user) ids.add(mpim.message.user)
  })
  return Array.from(ids)
}

function resolveDmsAndMpimsWithUsernames(
  dmResponse: SlackResponse,
  usersResponse: SlackUserResultsResponse,
): DmOrMpimWithUserDetails[] {
  const userMap = getUserMap(usersResponse.results)
  const ims = dmResponse.ims.map((im) => {
    const user = userMap[im.channel.user]
    const messageUser = im.message?.user ? userMap[im.message.user] : undefined
    return {
      type: 'im' as const,
      channelId: im.id,
      userId: im.channel.user,
      userRealName: user?.real_name,
      userSlackName: user?.name,
      lastMessage: im.message
        ? {
            text: im.message.text,
            ts: im.message.ts,
            userId: im.message.user,
            userRealName: messageUser?.real_name,
            userSlackName: messageUser?.name,
          }
        : undefined,
    }
  })
  const mpims = (dmResponse.mpims ?? []).map((mpim) => {
    const membersList =
      mpim.channel.members?.map((userId) => {
        const user = userMap[userId]
        return {
          userId,
          realName: user?.real_name,
          slackName: user?.name,
        }
      }) ?? []
    const messageUser = mpim.message?.user ? userMap[mpim.message.user] : undefined
    return {
      type: 'mpim' as const,
      channelId: mpim.id,
      members: membersList,
      lastMessage: mpim.message
        ? {
            text: mpim.message.text,
            ts: mpim.message.ts,
            userId: mpim.message.user,
            userRealName: messageUser?.real_name,
            userSlackName: messageUser?.name,
          }
        : undefined,
    }
  })
  return [...ims, ...mpims]
}

export async function fetchDmList(): Promise<DmOrMpimWithUserDetails[]> {
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
  }
  // Get all DMs
  const dmResponse = await fetch(`https://netlight.slack.com/api/client.dms?slack_route=${TENANT_ID}`, {
    credentials: 'include',
    headers: {
      ...sharedHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      count: '5',
      include_closed: 'true',
      include_channel: 'true',
      exclude_bots: 'true',
      priority_mode: 'priority',
    }).toString(),
    method: 'POST',
    mode: 'cors',
  })
  if (!dmResponse.ok) {
    throw new Error('Failed to fetch DM list')
  }
  const dmData = (await dmResponse.json()) as SlackResponse
  const userIds = getAllUserIdsToFetch(dmData)
  // Get all user data by user id
  const usersResponse = await fetch(`https://edgeapi.slack.com/cache/${TENANT_ID}/users/info`, {
    credentials: 'include',
    headers: {
      ...sharedHeaders,
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({
      check_interaction: true,
      include_profile_only_users: true,
      updated_ids: userIds.reduce(
        (acc, id) => {
          acc[id] = 0
          return acc
        },
        {} as Record<string, number>,
      ),
    }),
    method: 'POST',
    mode: 'cors',
  })
  if (!usersResponse.ok) {
    throw new Error('Failed to fetch users for DMs')
  }
  const usersData = (await usersResponse.json()) as SlackUserResultsResponse
  return resolveDmsAndMpimsWithUsernames(dmData, usersData)
}
