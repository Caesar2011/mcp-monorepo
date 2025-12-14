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

export interface Mail {
  uid: string
  account: string
  title: string
  read: boolean
  from: MailAddress
  date: string
}

export interface MailAccountResult {
  account: string
  mails: Mail[]
  error?: string
}

export interface ReadMailResult {
  id: string
  title: string
  content: string
  error?: string
}

export interface MailMarkResult {
  id: string
  title: string
  success: boolean
  error?: string
}
