import dgram from 'node:dgram'

import { type LogEntry, transports } from 'winston'

import { createSyslogMessage } from './encoder.js'
import { type SyslogSeverityString } from './types.js'

interface SyslogTransportOptions {
  host: string
  port: number
  appName: string
}

// UDP transport for sending logs
export class SyslogTransport extends transports.Console {
  private udpClient: dgram.Socket

  constructor(private opts: SyslogTransportOptions) {
    super({})
    this.udpClient = dgram.createSocket('udp4')
  }

  log(info: LogEntry, callback: () => void) {
    setImmediate(() => this.emit('logged', info))

    const message = createSyslogMessage({
      severity: info.level as SyslogSeverityString,
      appName: this.opts.appName,
      message: info.message,
    })

    // Send log message via UDP
    this.udpClient.send(Buffer.from(message), 0, message.length, this.opts.port, this.opts.host, (err) => {
      // eslint-disable-next-line use-logger-not-console/replace-console-with-logger
      if (err) console.error(`Failed to send log: ${err.message}`)
      callback()
    })
  }

  setName(name: string) {
    this.opts.appName = name
  }

  close(): void {
    if (this.udpClient) {
      this.udpClient.close()
    }
  }
}
