import dgram from 'node:dgram'

import { type LogEntry, transports } from 'winston'

import { createSyslogMessage } from './encoder.js'
import { type SyslogSeverityString } from './types.js'

interface SyslogTransportOptions {
  host: string
  port: number
  appName: string
}

export class SyslogTransport extends transports.Console {
  private udpClient: dgram.Socket
  private pendingMessages = 0
  private isClosing = false
  private closeResolver?: () => void
  private sequence = 0

  constructor(private opts: SyslogTransportOptions) {
    super({})
    this.udpClient = dgram.createSocket('udp4')
    this.udpClient.unref()
  }

  log(info: LogEntry, callback: () => void) {
    if (this.isClosing) {
      callback()
      return
    }

    setImmediate(() => this.emit('logged', info))

    const message = createSyslogMessage({
      severity: info.level as SyslogSeverityString,
      appName: this.opts.appName,
      message: info.message,
      sdId: 'mcp@log',
      sdParams: { seq: this.sequence++ },
    })

    this.pendingMessages++

    this.udpClient.send(Buffer.from(message), 0, message.length, this.opts.port, this.opts.host, (err) => {
      // eslint-disable-next-line use-logger-not-console/replace-console-with-logger
      if (err) console.error(`Failed to send log: ${err.message}`)

      this.pendingMessages--

      if (this.isClosing && this.pendingMessages === 0 && this.closeResolver) {
        this.closeResolver()
        this.closeResolver = undefined
      }

      callback()
    })
  }

  setName(name: string) {
    this.opts.appName = name
  }

  /**
   * Asynchronously waits for all pending logs to be sent and then closes the UDP socket.
   */
  public async close(): Promise<void> {
    if (this.isClosing) return
    this.isClosing = true

    this.udpClient.ref()

    if (this.pendingMessages === 0) {
      this.udpClient.close()
      return
    }
    await new Promise<void>((resolve) => {
      this.closeResolver = resolve
    })
    this.udpClient.close()
  }
}
