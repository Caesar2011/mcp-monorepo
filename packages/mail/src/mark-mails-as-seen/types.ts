// Types for mark-mails-as-seen tool
export interface MarkMailsAsSeenParams {
  username: string
  imapServer: string
  mailIds: string[]
}

export interface ValidatedParams extends MarkMailsAsSeenParams {
  username: string // Now guaranteed to exist
  imapServer: string // Now guaranteed to exist
  mailIds: string[] // Now guaranteed to exist and non-empty
}

export interface AccountCredentials {
  user: string
  pass: string
  host: string
  port: number
}

export interface MailMarkResult {
  id: string
  title: string
  success: boolean
  error?: string
}

export interface MarkMailsAsSeenResult {
  account: string
  totalProcessed: number
  successCount: number
  failureCount: number
  results: MailMarkResult[]
  error?: string
}
