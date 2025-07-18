import { getSlackEnv } from '../lib/env.js'

import type { ActivityFeedResponse } from './types.js'

export async function fetchActivityFeed(): Promise<ActivityFeedResponse> {
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
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  const params = new URLSearchParams()
  params.set('slack_route', TENANT_ID)

  const body = new URLSearchParams({
    limit: '20',
    types:
      'thread_v2,message_reaction,internal_channel_invite,list_record_edited,bot_dm_bundle,at_user,at_user_group,at_channel,at_everyone,keyword,list_record_assigned,list_user_mentioned,list_todo_notification,list_approval_request,list_approval_reviewed,external_channel_invite,external_dm_invite',
    mode: 'priority_reads_and_unreads_v1',
    archive_only: 'false',
    snooze_only: 'false',
    unread_only: 'false',
    priority_only: 'false',
  })

  const url = `https://netlight.slack.com/api/activity.feed?${params.toString()}`
  const response = await fetch(url, {
    credentials: 'include',
    headers: sharedHeaders,
    method: 'POST',
    body: body.toString(),
    mode: 'cors',
  })
  if (!response.ok) {
    throw new Error('Failed to fetch activity feed')
  }
  return response.json() as Promise<ActivityFeedResponse>
}
