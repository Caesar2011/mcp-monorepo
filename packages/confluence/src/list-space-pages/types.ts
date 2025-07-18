// Types for list-space-pages tool

export interface ListSpacePagesParams {
  spaceKey: string
  limit?: number
  start?: number
}

export interface ConfluenceListPagesResponse {
  results: unknown[]
  start: number
  limit: number
  size: number
  total?: number
  [key: string]: unknown
}
