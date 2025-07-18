/**
 * Utility functions to get Confluence API base URL and token from environment variables
 */

export function getConfluenceBaseUrl(): string {
  const url = process.env.CONFLUENCE_BASE_URL
  if (!url) throw new Error('CONFLUENCE_BASE_URL environment variable is not set')
  return url.replace(/\/$/, '') // remove trailing slash
}

export function getConfluenceToken(): string {
  const token = process.env.CONFLUENCE_TOKEN
  if (!token) throw new Error('CONFLUENCE_TOKEN environment variable is not set')
  return token
}
