// Types for latest-mails tool
export interface AccountCredentials {
  user: string
  pass: string
  host: string
  port: number
}

export interface MailAddress {
  address?: string
  name?: string
}

export interface MailEntry {
  id: string // Prefer IMAP UID or emailId if available
  subject: string
  read: boolean
  from: MailAddress
  date: string // ISO 8601, e.g. '2023-01-01T09:35'
}

export interface MailAccountResult {
  account: string
  mails: MailEntry[]
  error?: unknown
}
