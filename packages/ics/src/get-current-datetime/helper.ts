import type { GetCurrentDatetimeParams, GetCurrentDatetimeResult } from './types.js'

export function getCurrentDatetime(params: GetCurrentDatetimeParams): GetCurrentDatetimeResult {
  const { format = 'local' } = params || {}
  const now = new Date()
  let datetime = ''
  switch (format) {
    case 'iso':
      datetime = now.toISOString()
      break
    case 'utc':
      datetime = now.toUTCString()
      break
    case 'timestamp':
      datetime = now.getTime().toString()
      break
    case 'local':
    default:
      datetime = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      })
      break
  }
  return { datetime, format }
}
