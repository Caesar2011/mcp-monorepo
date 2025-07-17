/**
 * Jira environment variable helpers
 * Fetches JIRA_BASE_URL and JIRA_TOKEN from process.env and throws if missing.
 */

export function getJiraBaseUrl(): string {
  const url = process.env.JIRA_BASE_URL
  if (!url) throw new Error('JIRA_BASE_URL env variable is required')
  return url.replace(/\/$/, '') // Remove trailing slash
}

export function getJiraToken(): string {
  const token = process.env.JIRA_TOKEN
  if (!token) throw new Error('JIRA_TOKEN env variable is required')
  return token
}
