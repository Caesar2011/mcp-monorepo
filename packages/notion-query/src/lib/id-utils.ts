/**
 * A regex to extract a UUID v4 from a string.
 * It matches UUIDs with or without dashes.
 */
const UUID_REGEX = /([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})/

/**
 * Extracts a Notion page, database, or block ID from a URL or a raw ID string.
 * Normalizes the ID by removing dashes.
 * @param idOrUrl - The Notion URL or ID string.
 * @returns The normalized 32-character ID, or undefined if no valid ID is found.
 */
export function normalizeId(idOrUrl: string): string | undefined {
  const match = idOrUrl.match(UUID_REGEX)
  if (!match) {
    return undefined
  }
  // Reconstruct the ID without dashes
  return match.slice(1).join('')
}
