export enum SyslogSeverityString {
  Emergency = 'emerg', // System is unusable
  Alert = 'alert', // Action must be taken immediately
  Critical = 'crit', // Critical conditions
  Error = 'error', // Error conditions
  Warning = 'warning', // Warning conditions
  Notice = 'notice', // Normal but significant condition
  Informational = 'info', // Informational messages
  Debug = 'debug', // Debug-level messages
}

export interface StructuredDataParams {
  [key: string]: string | number | boolean
}

export interface SyslogMessage {
  message: string
  severity: SyslogSeverityString
  hostname?: string
  appName?: string
  procId?: string
  msgId?: string
  sdId?: string
  sdParams?: StructuredDataParams
}

export const SyslogSeverityLevels = {
  [SyslogSeverityString.Emergency]: 0,
  [SyslogSeverityString.Alert]: 1,
  [SyslogSeverityString.Critical]: 2,
  [SyslogSeverityString.Error]: 3,
  [SyslogSeverityString.Warning]: 4,
  [SyslogSeverityString.Notice]: 5,
  [SyslogSeverityString.Informational]: 6,
  [SyslogSeverityString.Debug]: 7,
}
