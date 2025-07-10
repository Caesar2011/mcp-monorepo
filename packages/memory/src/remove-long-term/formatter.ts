// Formatter for remove-long-term operation

export function formatRemoveLongTermResult(id: number, content: string, category: string | null): string {
  return (
    `✅ Long-term memory removed successfully!\n\n` +
    `Removed ID: ${id}\n` +
    `Content: ${content}\n` +
    `Category: ${category || 'None'}`
  )
}
