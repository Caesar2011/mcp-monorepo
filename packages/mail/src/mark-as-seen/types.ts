// Types for mark-as-seen tool
export interface MarkAsSeenParams {
  username: string
  imapServer: string
  mailIds: string[]
}

export interface ValidatedParams extends MarkAsSeenParams {
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

export interface MarkAsSeenResult {
  account: string
  totalProcessed: number
  successCount: number
  failureCount: number
  results: MailMarkResult[]
  error?: string
}
