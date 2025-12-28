import {
  type StructuredDataParams,
  type SyslogMessage,
  SyslogSeverityLevels,
  type SyslogSeverityString,
} from './types.js'

const SYSLOG_TOKENS = {
  TILDE: '~t~',
  BACKSLASH: '~b~',
  QUOTE: '~q~',
  NEWLINE: '~n~',
  CARRIAGE_RETURN: '~r~',
} as const

const SyslogSeverityStringsByLevel: { [key: number]: SyslogSeverityString } = Object.entries(
  SyslogSeverityLevels,
).reduce(
  (acc, [key, value]) => {
    acc[value] = key as SyslogSeverityString
    return acc
  },
  {} as { [key: number]: SyslogSeverityString },
)

/**
 * Unescapes special characters from a syslog field back to their original form.
 * The order of replacement is the reverse of the encoding process.
 *
 * @param value The escaped string.
 * @returns The original, unescaped string.
 */
function unescapeSyslogField(value: string | undefined): string {
  if (value === undefined) {
    return ''
  }
  return String(value)
    .replace(new RegExp(SYSLOG_TOKENS.CARRIAGE_RETURN, 'g'), '\r')
    .replace(new RegExp(SYSLOG_TOKENS.NEWLINE, 'g'), '\n')
    .replace(new RegExp(SYSLOG_TOKENS.QUOTE, 'g'), '"')
    .replace(new RegExp(SYSLOG_TOKENS.BACKSLASH, 'g'), '\\')
    .replace(new RegExp(SYSLOG_TOKENS.TILDE, 'g'), '~')
}

/**
 * Decodes a syslog message string into a SyslogMessage object.
 *
 * @param syslogString The syslog message string to decode.
 * @returns A SyslogMessage object.
 * @throws An Error if the syslog string format is invalid.
 */
export function decodeSyslogMessage(syslogString: string): SyslogMessage {
  if (!syslogString) {
    throw new Error('Input syslog string cannot be empty.')
  }

  const headerRegex = /^<(\d+)>(\d+) (\S+) (\S+) (\S+) (\S+) (\S+) (.*)$/s
  const match = syslogString.match(headerRegex)

  if (!match) {
    throw new Error(
      'Invalid syslog message format: Could not parse header. Expected: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID ...',
    )
  }

  const [, priorityStr, , , hostname, appName, procId, msgId, rest] = match

  const priority = parseInt(priorityStr, 10)
  const severityLevel = priority % 8
  const severity = SyslogSeverityStringsByLevel[severityLevel]

  if (severity === undefined) {
    throw new Error(`Invalid syslog message: Unknown severity level ${severityLevel} from priority ${priority}.`)
  }

  let sdId: string | undefined
  let sdParams: StructuredDataParams | undefined
  let message: string
  let structuredDataPart: string

  if (rest.startsWith('[')) {
    const sdEndIndex = rest.indexOf('] ')
    if (sdEndIndex === -1) {
      if (rest.endsWith(']')) {
        structuredDataPart = rest
        message = ''
      } else {
        throw new Error(
          'Invalid syslog message: Malformed structured data - missing closing bracket or subsequent space.',
        )
      }
    } else {
      structuredDataPart = rest.substring(0, sdEndIndex + 1)
      message = rest.substring(sdEndIndex + 2)
    }

    const sdContentMatch = structuredDataPart.match(/^\[([^ ]+)(.*)]$/s)
    if (!sdContentMatch) {
      throw new Error('Invalid syslog message: Malformed structured data content.')
    }
    sdId = sdContentMatch[1]
    const paramsString = sdContentMatch[2].trim()

    if (paramsString) {
      sdParams = {}
      const paramRegex = /(\S+)="([^"]*)"/g
      let paramMatch: RegExpExecArray | null
      while ((paramMatch = paramRegex.exec(paramsString))) {
        const key = paramMatch[1]
        sdParams[key] = unescapeSyslogField(paramMatch[2])
      }
    }
  } else if (rest === '-') {
    message = ''
  } else if (rest.startsWith('- ')) {
    message = rest.substring(2)
  } else {
    message = rest
  }

  return {
    message: unescapeSyslogField(message),
    severity: severity,
    hostname: hostname === '-' ? undefined : hostname,
    appName: appName === '-' ? undefined : appName,
    procId: procId === '-' ? undefined : procId,
    msgId: msgId === '-' ? undefined : msgId,
    sdId: sdId,
    sdParams: sdParams,
  }
}
