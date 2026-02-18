import dgram from 'node:dgram'

import { createLogger, format, transports } from 'winston'

import { decodeSyslogMessage } from './decoder.js'
import { SyslogSeverityLevels, type SyslogMessage } from './types.js'

const port = process.env.LOG_PORT
const LOG_PORT = port && Number.isInteger(port) ? +port : 12345
const FLUSH_TIMEOUT_MS = 500

const logger = createLogger({
  level: 'debug',
  levels: SyslogSeverityLevels,
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`),
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
})

const server = dgram.createSocket('udp4')
const messageBuffer = new Map<number, SyslogMessage>()
let nextExpectedSequence = 0
let flushTimer: NodeJS.Timeout | undefined = undefined

const logMessage = (msg: SyslogMessage, rinfo: dgram.RemoteInfo) => {
  logger.log({
    message: msg.message,
    level: (msg.severity || 'info').toLowerCase(),
    appName: msg.appName || rinfo.address,
    hostname: msg.hostname || 'unknown-host',
  })
}

const processBuffer = (rinfo: dgram.RemoteInfo) => {
  let msg: SyslogMessage | undefined
  while ((msg = messageBuffer.get(nextExpectedSequence))) {
    logMessage(msg, rinfo)
    messageBuffer.delete(nextExpectedSequence)
    nextExpectedSequence++
  }
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = undefined
  }
  if (messageBuffer.size > 0) {
    flushTimer = setTimeout(() => flushBufferedMessages(rinfo), FLUSH_TIMEOUT_MS)
  }
}

const flushBufferedMessages = (rinfo: dgram.RemoteInfo) => {
  if (messageBuffer.size === 0) return

  const sortedKeys = [...messageBuffer.keys()].sort((a, b) => a - b)
  const lowestSeqInBiffer = sortedKeys[0]

  logger.warn(
    `Detected lost log messages. Expected #${nextExpectedSequence}, but next is #${lowestSeqInBiffer}. Flushing buffer.`,
  )
  nextExpectedSequence = lowestSeqInBiffer
  processBuffer(rinfo)
}

server.on('error', (err) => {
  logger.error(`Syslog server error: ${err.stack}`)
  server.close()
  process.exit(1)
})

server.on('message', (msg, rinfo) => {
  try {
    const parsedMessage = decodeSyslogMessage(msg.toString())
    const seq = parsedMessage.sdParams?.seq ? Number(parsedMessage.sdParams.seq) : -1

    if (seq === -1 || seq < nextExpectedSequence) {
      logMessage(parsedMessage, rinfo)
      return
    }

    messageBuffer.set(seq, parsedMessage)
    processBuffer(rinfo)
  } catch (error) {
    logger.error(`Failed to parse syslog message: ${error instanceof Error ? error.message : String(error)}`)
    logger.debug(`Raw message: ${msg.toString()}`)
  }
})

server.on('listening', () => {
  const address = server.address()
  logger.info(`Slim Syslog Server listening on ${address.address}:${address.port}`)
})

server.bind(LOG_PORT, '127.0.0.1')

const handleShutdown = () => {
  logger.info('Closing syslog server...')
  if (flushTimer) clearTimeout(flushTimer)
  flushBufferedMessages({ address: 'shutdown', family: 'IPv4', port: 0, size: 0 })
  server.close(() => {
    logger.info('Server shut down gracefully.')
    process.exit(0)
  })
}
process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)
