import dgram from 'node:dgram'

import { createLogger, format, transports } from 'winston'

import { decodeSyslogMessage } from './decoder.js'
import { SyslogSeverityLevels } from './types.js'

// Environment variables
const port = process.env.LOG_PORT
const LOG_PORT = port && Number.isInteger(port) ? +port : 12345

// Set up Winston logger
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

// Create a UDPv4 socket
const server = dgram.createSocket('udp4')

server.on('error', (err) => {
  logger.error(`Syslog server error: ${err.stack}`)
  server.close()
  process.exit(1)
})

server.on('message', (msg, rinfo) => {
  const parsedMessage = decodeSyslogMessage(msg.toString())
  const level = (parsedMessage.severity || 'info').toLowerCase()
  const appName = parsedMessage.appName || rinfo.address
  const hostname = parsedMessage.hostname || 'unknown-host'
  const message = parsedMessage.message

  logger.log({
    message,
    level,
    appName,
    hostname,
  })
})

server.on('listening', () => {
  const address = server.address()
  logger.info(`Slim Syslog Server listening on ${address.address}:${address.port}`)
})

server.bind(LOG_PORT, '127.0.0.1')

const handleShutdown = () => {
  logger.info('Closing syslog server...')
  server.close(() => {
    logger.info('Server shut down gracefully.')
    process.exit(0)
  })
}
process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)
