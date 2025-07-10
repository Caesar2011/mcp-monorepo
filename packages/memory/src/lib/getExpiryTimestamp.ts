// Maps storage type to expiry timestamp or null for permanent
import { type StorageType } from './types.js'

export function getExpiryTimestamp(storageType: StorageType): number | undefined {
  const now = Date.now()
  if (storageType === 'short_term') {
    return now + 7 * 24 * 60 * 60 * 1000
  }
  if (storageType === 'mid_term') {
    return now + 90 * 24 * 60 * 60 * 1000
  }
  if (storageType === 'long_term') {
    return undefined
  }
  throw new Error(`Invalid storage type: ${storageType}`)
}
