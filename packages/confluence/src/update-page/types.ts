// Types for update-page tool

export interface UpdatePageParams {
  pageId: string
  newTitle: string
  newContent: string
  currentVersionNumber: number
}

export interface ConfluenceUpdatePageResponse {
  id: string
  type: string
  status: string
  title: string
  [key: string]: unknown
}
