// Generic memory storage result formatter
import { formatExpiryDate } from './formatExpiryDate.js'
import { storageTypeProperties } from './storageTypeProperties.js'
import { type StorageType } from './types.js'

/**
 * Formats a result message for memory storage, handling all storage types.
 */
export function formatStoreMemoryResult(
  storageType: StorageType,
  memoryId: number,
  memory: string,
  category: string,
): string {
  const duration = storageTypeProperties[storageType].duration
  let expiresLine: string

  if (storageType === 'long_term') {
    expiresLine = 'Expires: Never'
  } else if (storageType === 'mid_term') {
    // 90 days
    expiresLine = `Expires: ${formatExpiryDate(Date.now() + 90 * 24 * 60 * 60 * 1000)}`
  } else {
    // 7 days
    expiresLine = `Expires: ${formatExpiryDate(Date.now() + 7 * 24 * 60 * 60 * 1000)}`
  }

  const categoryLabel = category && category.trim() ? category : 'None'

  return (
    `✅ ${storageType.replace('_', '-')} memory stored successfully!\n\n` +
    `ID: ${memoryId}\n` +
    `Content: ${memory}\n` +
    `Category: ${categoryLabel}\n` +
    `Storage: ${duration}\n` +
    `${expiresLine}`
  )
}
