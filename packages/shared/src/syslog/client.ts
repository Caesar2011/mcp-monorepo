import * as process from 'node:process'

import { createLogger, format } from 'winston'

import { SyslogTransport } from './SyslogTransport.js'
import { SyslogSeverityLevels } from './types.js'

// Environment variables
const SYSLOG_SERVER_HOST = '127.0.0.1' // Address of the syslog server
const SYSLOG_SERVER_PORT = 12345 // Port defined in the syslog server

const transport = new SyslogTransport({
  host: SYSLOG_SERVER_HOST,
  port: SYSLOG_SERVER_PORT,
  appName: process.env.APP_NAME ?? 'syslog-client',
})

// Configure winston logger
const _logger = createLogger({
  level: 'debug',
  levels: SyslogSeverityLevels,
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`),
  ),
  transports: [transport],
})

const parseMessage = (...message: unknown[]): string => {
  // Custom replacer for JSON.stringify to handle functions, symbols, and errors gracefully
  const replacer = (key: string, value: unknown) => {
    if (typeof value === 'symbol') return value.toString() // Convert symbols to string
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]` // Convert functions to string
    return value // Default case for other values
  }

  return message
    .map((item) => {
      if (typeof item === 'symbol') {
        return item.toString()
      }

      if (typeof item === 'function') {
        return `[Function: ${item.name || 'anonymous'}]` // Convert standalone functions
      }

      // eslint-disable-next-line no-restricted-syntax
      if (typeof item === 'object' && item !== null) {
        if (item instanceof Error) return item.stack ?? item.message
        try {
          const baseObjectString = JSON.stringify(item, replacer, 2)

          // Include properties referenced by symbols
          const symbols = Object.getOwnPropertySymbols(item)
            // @ts-expect-error Checked before
            .map((symbol) => `[${symbol.toString()}]: ${String(item[symbol])}`)
            .join(', ')

          return symbols ? `${baseObjectString.slice(0, -1)}, ${symbols}\n}` : baseObjectString
        } catch {
          return '[Unserializable]' // Handle circular references or non-serializable parts
        }
      }

      try {
        return String(item) // Fallback for primitives and serializable values
      } catch {
        return '[Unstringifiable]' // Catch-all for unexpected cases
      }
    })
    .join(' ') // Join output with spaces to mimic console.log
}

export const logger = {
  emerg: (...message: unknown[]) => _logger.emerg(parseMessage(...message)),
  alert: (...message: unknown[]) => _logger.alert(parseMessage(...message)),
  crit: (...message: unknown[]) => _logger.crit(parseMessage(...message)),
  error: (...message: unknown[]) => _logger.error(parseMessage(...message)),
  warning: (...message: unknown[]) => _logger.warning(parseMessage(...message)),
  notice: (...message: unknown[]) => _logger.notice(parseMessage(...message)),
  info: (...message: unknown[]) => _logger.info(parseMessage(...message)),
  debug: (...message: unknown[]) => _logger.debug(parseMessage(...message)),

  warn: (...message: unknown[]) => _logger.warning(parseMessage(...message)),
  log: (...message: unknown[]) => _logger.debug(parseMessage(...message)),

  getLevel: () => _logger.level,
  setLevel: (_level: string) => {},
  setName: (name: string) => transport.setName(name),
  close: (): void => {
    _logger.close()
  },
}
