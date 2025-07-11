// types for read-mail tool

export interface ReadMailParams {
  username: string
  imapServer: string
  mailIds: string[]
}

export interface ReadMailResult {
  id: string
  title: string
  content: string
  error?: string
}
