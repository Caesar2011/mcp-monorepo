export interface GetCurrentDatetimeParams {
  format?: 'iso' | 'local' | 'utc' | 'timestamp'
}

export interface GetCurrentDatetimeResult {
  datetime: string
  format: 'iso' | 'local' | 'utc' | 'timestamp'
}
