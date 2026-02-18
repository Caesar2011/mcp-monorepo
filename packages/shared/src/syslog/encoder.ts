import { type SyslogMessage, SyslogSeverityLevels } from './types.js'

const SYSLOG_TOKENS = {
  TILDE: '~t~',
  BACKSLASH: '~b~',
  QUOTE: '~q~',
  NEWLINE: '~n~',
  CARRIAGE_RETURN: '~r~',
} as const

/**
 * Escapes special characters in a string field for safe transport within a syslog message.
 * The order of replacement is critical to prevent token corruption.
 *
 * @param value The string to escape.
 * @returns The escaped string.
 */
function escapeSyslogField(value: string | undefined): string {
  if (value === undefined) {
    return ''
  }
  return String(value)
    .replace(/~/g, SYSLOG_TOKENS.TILDE)
    .replace(/\\/g, SYSLOG_TOKENS.BACKSLASH)
    .replace(/"/g, SYSLOG_TOKENS.QUOTE)
    .replace(/\n/g, SYSLOG_TOKENS.NEWLINE)
    .replace(/\r/g, SYSLOG_TOKENS.CARRIAGE_RETURN)
}

const WEB_APP_FACILITY = 16 // LocalUse0 - Often used for custom applications.

/**
 * Encodes a SyslogMessage object into a standard RFC 5424 syslog string,
 * using a custom, robust escaping mechanism for message and structured data content.
 *
 * @param options The SyslogMessage object to encode.
 * @returns A formatted syslog string.
 */
export function createSyslogMessage(options: SyslogMessage): string {
  const { message, severity, hostname, appName, procId, msgId, sdId, sdParams } = options

  const priority = WEB_APP_FACILITY * 8 + SyslogSeverityLevels[severity]

  const version = 1
  const now = new Date()
  const pad = (num: number): string => String(num).padStart(2, '0')
  const padMilliseconds = (num: number): string => String(num).padStart(3, '0')

  const timestamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(
    now.getUTCDate(),
  )}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(
    now.getUTCSeconds(),
  )}.${padMilliseconds(now.getUTCMilliseconds())}Z`

  const resolvedHostname = hostname ?? 'localhost'
  const resolvedAppName = appName ?? '-'
  const resolvedProcId = procId ?? '-'
  const resolvedMsgId = msgId ?? '-'

  let structuredData = '-'
  const sdIdToUse = sdId || 'mcp@log'
  const sdParamsToUse = { ...sdParams }

  const sdContentParts: string[] = []
  for (const key in sdParamsToUse) {
    if (Object.prototype.hasOwnProperty.call(sdParamsToUse, key)) {
      const value = sdParamsToUse[key]
      const escapedValue = escapeSyslogField(String(value))
      sdContentParts.push(`${key}="${escapedValue}"`)
    }
  }

  if (sdContentParts.length > 0) {
    structuredData = `[${sdIdToUse} ${sdContentParts.join(' ')}]`
  }

  const escapedMessage = escapeSyslogField(message)

  return `<${priority}>${version} ${timestamp} ${resolvedHostname} ${resolvedAppName} ${resolvedProcId} ${resolvedMsgId} ${structuredData} ${escapedMessage}`
}
