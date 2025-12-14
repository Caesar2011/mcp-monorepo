import { type SyslogMessage, SyslogSeverityLevels } from './types.js'

const WEB_APP_FACILITY = 16 // LocalUse0 - Often used for custom applications/web servers

export function createSyslogMessage(options: SyslogMessage): string {
  const { message, severity, hostname, appName, procId, msgId, sdId, sdParams } = options

  const priority = WEB_APP_FACILITY * 8 + SyslogSeverityLevels[severity]

  const version = 1
  const now = new Date()
  const pad = (num: number) => String(num).padStart(2, '0')
  const padMilliseconds = (num: number) => String(num).padStart(3, '0')

  const timestamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${padMilliseconds(now.getUTCMilliseconds())}Z`

  const resolvedHostname = hostname || 'localhost'

  const resolvedAppName = appName || '-'
  const resolvedProcId = procId || '-'
  const resolvedMsgId = msgId || '-'

  let structuredData: string = '-'

  if (sdId && sdParams) {
    const sdContentParts: string[] = []
    for (const key in sdParams) {
      if (Object.prototype.hasOwnProperty.call(sdParams, key)) {
        const value = sdParams[key]
        const escapedValue = String(value)
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
        sdContentParts.push(`${key}="${escapedValue}"`)
      }
    }
    structuredData = `[${sdId} ${sdContentParts.join(' ')}]`
  }

  const escapedMessage = message.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r')

  return (
    `<${priority}>${version} ${timestamp} ${resolvedHostname} ${resolvedAppName} ${resolvedProcId} ${resolvedMsgId} ` +
    `${structuredData} ${escapedMessage}`
  )
}
