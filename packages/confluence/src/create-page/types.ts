// Types for create-page tool

export interface CreatePageParams {
  spaceKey: string
  title: string
  content: string
  parentId?: string
}

export interface ConfluenceCreatePageResponse {
  id: string
  type: string
  status: string
  title: string
  [key: string]: unknown
}
