/**
 * Jira environment variable helpers.
 * Exactly one of JIRA_TOKEN or JIRA_COOKIE must be set.
 */

export type JiraAuthMode = { type: 'token'; value: string } | { type: 'cookie'; value: string }
export type JiraApiVersion = '2' | '3'

export function getJiraBaseUrl(): string {
  const url = process.env.JIRA_BASE_URL
  if (!url) throw new Error('JIRA_BASE_URL env variable is required')
  return url.replace(/\/$/, '')
}

export function getJiraAuthMode(): JiraAuthMode {
  const token = process.env.JIRA_TOKEN
  const cookie = process.env.JIRA_COOKIE

  if (token && cookie) {
    throw new Error('Exactly one of JIRA_TOKEN or JIRA_COOKIE must be set, but both are defined.')
  }
  if (!token && !cookie) {
    throw new Error('Exactly one of JIRA_TOKEN or JIRA_COOKIE must be set, but neither is defined.')
  }

  return token ? { type: 'token', value: token } : { type: 'cookie', value: cookie as string }
}

export function getJiraApiVersion(): JiraApiVersion {
  const version = process.env.JIRA_API_VERSION
  if (version && version !== '2' && version !== '3') {
    throw new Error('JIRA_API_VERSION must be either "2" or "3"')
  }
  return (version || '2') as JiraApiVersion // Default: v2
}
