// Formats an expiry timestamp (or returns 'Never')
export function formatExpiryDate(invalidAfter: number | undefined): string {
  if (!invalidAfter) return 'Never'
  return new Date(invalidAfter).toISOString().split('T')[0]
}
