// Types for list-spaces tool

export interface ListSpacesParams {
  limit?: number
  start?: number
}

export interface ConfluenceSpacesResponse {
  results: unknown[]
  start: number
  limit: number
  size: number
  total?: number
  [key: string]: unknown
}
