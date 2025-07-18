// Loads all relevant environment variables for Slack API access
export interface SlackEnv {
  XOXD_TOKEN: string
  XOXC_TOKEN: string
  TENANT_ID: string
}

export function getSlackEnv(): SlackEnv {
  const XOXD_TOKEN = process.env.XOXD_TOKEN
  const XOXC_TOKEN = process.env.XOXC_TOKEN
  const TENANT_ID = process.env.TENANT_ID
  if (!XOXD_TOKEN || !XOXC_TOKEN || !TENANT_ID) {
    throw new Error('Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID')
  }
  return { XOXD_TOKEN, XOXC_TOKEN, TENANT_ID }
}
