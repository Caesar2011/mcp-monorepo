import { IS_TOOL_ADVISORY_ONLY } from '@mcp-monorepo/shared'

// Loads all relevant environment variables for Slack API access
export interface SlackEnv {
  SLACK_WORKSPACE_URL: string
  XOXD_TOKEN: string
  XOXC_TOKEN: string
  TENANT_ID: string
}

export function getSlackEnv(): SlackEnv {
  // When generating documentation, we don't need real credentials.
  // Return dummy values to satisfy the types, as API calls will be skipped.
  if (IS_TOOL_ADVISORY_ONLY) {
    return {
      SLACK_WORKSPACE_URL: 'https://dummy.slack.com',
      XOXD_TOKEN: 'dummy-xoxd-token',
      XOXC_TOKEN: 'dummy-xoxc-token',
      TENANT_ID: 'dummy-tenant-id',
    }
  }

  const SLACK_WORKSPACE_URL = process.env.SLACK_WORKSPACE_URL
  const XOXD_TOKEN = process.env.XOXD_TOKEN
  const XOXC_TOKEN = process.env.XOXC_TOKEN
  const TENANT_ID = process.env.TENANT_ID
  if (!SLACK_WORKSPACE_URL || !XOXD_TOKEN || !XOXC_TOKEN || !TENANT_ID) {
    throw new Error(
      'Missing required Slack environment variables: SLACK_WORKSPACE_URL, XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
    )
  }
  return { SLACK_WORKSPACE_URL, XOXD_TOKEN, XOXC_TOKEN, TENANT_ID }
}
