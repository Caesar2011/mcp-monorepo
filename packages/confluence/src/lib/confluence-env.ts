/**
 * Confluence environment variable helpers.
 * Exactly one of CONFLUENCE_TOKEN or CONFLUENCE_COOKIE must be set.
 */

export type ConfluenceAuthMode = { type: 'token'; value: string } | { type: 'cookie'; value: string }
export type ConfluenceApiVersion = '1' | '2'

export function getConfluenceBaseUrl(): string {
  const url = process.env.CONFLUENCE_BASE_URL
  if (!url) throw new Error('CONFLUENCE_BASE_URL environment variable is not set')
  return url.replace(/\/$/, '') // remove trailing slash
}

export function getConfluenceAuthMode(): ConfluenceAuthMode {
  const token = process.env.CONFLUENCE_TOKEN
  const cookie = process.env.CONFLUENCE_COOKIE

  if (token && cookie) {
    throw new Error('Exactly one of CONFLUENCE_TOKEN or CONFLUENCE_COOKIE must be set, but both are defined.')
  }
  if (!token && !cookie) {
    throw new Error('Exactly one of CONFLUENCE_TOKEN or CONFLUENCE_COOKIE must be set, but neither is defined.')
  }

  return token ? { type: 'token', value: token } : { type: 'cookie', value: cookie as string }
}

export function getConfluenceApiVersion(): ConfluenceApiVersion {
  const version = process.env.CONFLUENCE_API_VERSION
  if (version === '2') return '2'
  return '1' // Default to v1
}
