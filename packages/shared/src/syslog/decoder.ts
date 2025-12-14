import {
  type StructuredDataParams,
  type SyslogMessage,
  SyslogSeverityLevels,
  type SyslogSeverityString,
} from './types.js'

const SyslogSeverityStringsByLevel: { [key: number]: SyslogSeverityString } = {}
for (const key in SyslogSeverityLevels) {
  if (Object.prototype.hasOwnProperty.call(SyslogSeverityLevels, key)) {
    const level = SyslogSeverityLevels[key as SyslogSeverityString]
    SyslogSeverityStringsByLevel[level] = key as SyslogSeverityString
  }
}

function unescape(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\\"/g, '"').replace(/\\\\/g, '\\')
}

/**
 * Decodes a syslog message string into a SyslogMessage object.
 *
 * @param syslogString The syslog message string to decode.
 * @returns A SyslogMessage object.
 * @throws Error if the syslog string format is invalid.
 */
export function decodeSyslogMessage(syslogString: string): SyslogMessage {
  if (!syslogString || syslogString.length === 0) {
    throw new Error('Input syslog string cannot be empty.')
  }

  const headerRegex = /^<(\d+)>(\d+) (\S+) (\S+) (\S+) (\S+) (\S+) (.*)$/
  const match = syslogString.match(headerRegex)

  if (!match) {
    throw new Error(
      'Invalid syslog message format: Could not parse header. Ensure it matches <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID ...',
    )
  }

  const [, priorityStr, , , hostname, appName, procId, msgId, rest] = match

  const priority = parseInt(priorityStr, 10)
  const severityLevel = priority % 8
  const severity = SyslogSeverityStringsByLevel[severityLevel]

  if (severity === undefined) {
    throw new Error(
      `Invalid syslog message: Unknown severity level ${severityLevel} derived from priority ${priority}.`,
    )
  }

  let sdId: string | undefined
  let sdParams: StructuredDataParams | undefined
  let message: string

  if (rest.startsWith('[') && rest.includes(']')) {
    const sdEndIndex = rest.indexOf(']')
    if (sdEndIndex === -1) {
      throw new Error('Invalid syslog message: Malformed structured data - missing closing bracket.')
    }

    const structuredDataPart = rest.substring(0, sdEndIndex + 1)
    message = rest.substring(sdEndIndex + 2)

    const sdContentMatch = structuredDataPart.match(/^\[([^ ]+)(.*)]$/)
    if (!sdContentMatch) {
      throw new Error('Invalid syslog message: Malformed structured data content inside brackets.')
    }
    sdId = sdContentMatch[1] // The SD-ID (e.g., "event@12345")
    const paramsString = sdContentMatch[2].trim() // The parameters string (e.g., "param1="value1"")

    if (paramsString) {
      sdParams = {}
      const paramRegex = /(\S+)="((?:[^"\\]|\\.)*?)"/g
      let paramMatch
      // eslint-disable-next-line no-restricted-syntax
      while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
        const key = paramMatch[1]
        // Unescape backslashes first, then double quotes
        sdParams[key] = unescape(paramMatch[2])
      }
    }
  } else {
    if (rest.startsWith('- ')) {
      message = rest.substring(2)
    } else if (rest === '-') {
      message = ''
    } else {
      // eslint-disable-next-line
      console.warn(`Unexpected syslog format: Structured data not found or malformed. Treating "${rest}" as message.`)
      message = rest
    }
  }

  return {
    message: unescape(message),
    severity: severity,
    hostname: hostname === '-' ? undefined : hostname,
    appName: appName === '-' ? undefined : appName,
    procId: procId === '-' ? undefined : procId,
    msgId: msgId === '-' ? undefined : msgId,
    sdId: sdId,
    sdParams: sdParams,
  }
}
