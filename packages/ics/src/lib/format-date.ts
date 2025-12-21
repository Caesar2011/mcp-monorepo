/**
 * Formats a Date object into a string.
 * @param date The date to format.
 * @param allDay If true, only the date part is returned (YYYY-MM-DD).
 * @returns A formatted date string.
 */
export function formatDate(date: Date, allDay: boolean): string {
  if (allDay) {
    // For all-day events, return in YYYY-MM-DD format
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
