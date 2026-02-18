/**
 * Bidirectional cache for spaceKey ↔ spaceId mapping.
 * Used to resolve space keys to IDs for Confluence API v2 (which uses numeric IDs).
 */

import { requestConfluence } from './request.js'

const keyToId = new Map<string, string>()
const idToKey = new Map<string, string>()
const pendingRequests = new Map<string, Promise<string>>()

/**
 * Manually add a space key/ID mapping to the cache (e.g., from list-spaces results)
 */
export function setSpaceMapping(key: string, id: string): void {
  keyToId.set(key, id)
  idToKey.set(id, key)
}

/**
 * Get space key by ID from cache (synchronous)
 * @returns Space key if cached, undefined otherwise
 */
export function getSpaceKeyById(spaceId: string): string | undefined {
  return idToKey.get(spaceId)
}

/**
 * Get space ID by key (with lazy loading from API)
 * Deduplicates concurrent requests for the same space key
 * @throws Error if space not found or API request fails
 */
export async function getSpaceIdByKey(spaceKey: string): Promise<string> {
  // Check cache first
  const cached = keyToId.get(spaceKey)
  if (cached) return cached

  // Check if request is already in-flight (deduplication)
  const pending = pendingRequests.get(spaceKey)
  if (pending) return pending

  // Fetch from API (always use v1 API for space lookup)
  const promise = fetchSpaceIdFromApi(spaceKey)
  pendingRequests.set(spaceKey, promise)

  try {
    const id = await promise
    setSpaceMapping(spaceKey, id)
    return id
  } finally {
    pendingRequests.delete(spaceKey)
  }
}

/**
 * Fetch space ID from Confluence API v1
 * @private
 */
async function fetchSpaceIdFromApi(spaceKey: string): Promise<string> {
  interface SpaceResponse {
    id?: string | number
    key: string
    name: string
  }

  try {
    const response = await requestConfluence<SpaceResponse>({
      endpoint: `/rest/api/space/${spaceKey}`,
      method: 'GET',
    })

    if (!response.id) {
      throw new Error(`Space with key '${spaceKey}' not found (no ID in response)`)
    }

    return String(response.id)
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(`Space with key '${spaceKey}' not found`)
    }
    throw error
  }
}
