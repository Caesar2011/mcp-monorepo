import { slackClient } from './slack-client.js'

export async function fetchMessageByTs({
  channel,
  ts,
  thread_ts,
}: {
  channel: string
  ts: string
  thread_ts?: string
}) {
  const response = await slackClient.conversations.replies({
    channel,
    ts,
  })
  return response.messages?.find((msg) => (thread_ts ? msg.thread_ts === thread_ts : !msg.thread_ts))
}
