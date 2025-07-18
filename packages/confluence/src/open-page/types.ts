// Types for open-page tool

export interface OpenPageParams {
  pageId: string
}

export interface ConfluencePageResponse {
  id: string
  type: string
  status: string
  title: string
  [key: string]: unknown
}
