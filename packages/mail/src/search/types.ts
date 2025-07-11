// types.ts for mail search tool
import type { MailAddress } from '../latest-mails/types.js'

export interface SearchMailParams {
  searchString?: string
  searchBody?: boolean
  fromContains?: string
}

export interface NormalizedSearchMailParams extends SearchMailParams {
  searchBody: boolean
}

export interface SearchMailEntry {
  uid: string
  account: string
  title: string
  read: boolean
  from: MailAddress
  date: string
}

export interface SearchMailAccountResult {
  account: string
  mails: SearchMailEntry[]
  error?: unknown
}
