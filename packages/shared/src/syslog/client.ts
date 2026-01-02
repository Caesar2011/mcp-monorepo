import { createLogger, format } from 'winston'

import { SyslogTransport } from './SyslogTransport.js'
import { SyslogSeverityLevels } from './types.js'

const SYSLOG_SERVER_HOST = '127.0.0.1'
const SYSLOG_SERVER_PORT = 12345

const transport = new SyslogTransport({
  host: SYSLOG_SERVER_HOST,
  port: SYSLOG_SERVER_PORT,
  appName: process.env.APP_NAME ?? 'syslog-client',
})

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
  const replacer = (key: string, value: unknown) => {
    if (typeof value === 'symbol') return value.toString()
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`
    return value
  }

  return message
    .map((item) => {
      if (typeof item === 'symbol') {
        return item.toString()
      }

      if (typeof item === 'function') {
        return `[Function: ${item.name || 'anonymous'}]`
      }

      if (typeof item === 'object' && item) {
        if (item instanceof Error) return item.stack ?? item.message
        try {
          const baseObjectString = JSON.stringify(item, replacer, 2)

          const symbols = Object.getOwnPropertySymbols(item)
            // @ts-expect-error Checked before
            .map((symbol) => `[${symbol.toString()}]: ${String(item[symbol])}`)
            .join(', ')

          return symbols ? `${baseObjectString.slice(0, -1)}, ${symbols}\n}` : baseObjectString
        } catch {
          return '[Unserializable]'
        }
      }

      try {
        return String(item)
      } catch {
        return '[Unstringifiable]'
      }
    })
    .join(' ')
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

  close: async (): Promise<void> => {
    // We call the transport's close directly because winston's logger.close() is synchronous
    // and won't wait for our async transport to finish.
    await transport.close()
  },
}

let isShuttingDown = false

async function gracefulShutdown(signal: string, exitCode = 0) {
  if (isShuttingDown) return
  isShuttingDown = true

  try {
    await logger.close()
  } catch (e) {
    // eslint-disable-next-line use-logger-not-console/replace-console-with-logger
    console.error('Error during graceful shutdown:', e)
    exitCode = 1
  } finally {
    process.exit(exitCode)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('uncaughtException', async (error, origin) => {
  // eslint-disable-next-line use-logger-not-console/replace-console-with-logger
  console.error(`Uncaught Exception on ${origin}:`, error)
  // Log the critical error
  logger.crit(`Uncaught Exception on ${origin}: ${error.stack ?? error.message}`)
  await gracefulShutdown('uncaughtException', 2)
})

process.on('unhandledRejection', async (reason, promise) => {
  // eslint-disable-next-line use-logger-not-console/replace-console-with-logger
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  logger.crit(`Unhandled Rejection: ${reason instanceof Error ? reason.stack : String(reason)}`)
  await gracefulShutdown('unhandledRejection', 3)
})
