export interface ConfluenceErrorResponse {
  statusCode: number
  data: {
    authorized: boolean
    valid: boolean
    allowedInReadOnlyMode: boolean
    errors: string[] // Array of error strings
    successful: boolean
  }
  message: string // Error message
  reason: string // Reason for the error
}

export interface ConfluenceItemBase {
  id: number | string
  type: ConfluenceContentType
  status: ConfluencePageStatus
  _links: {
    webui: string
    edit?: string
    tinyui: string
    collection: string
    base?: string
    context?: string
    self: string
  }
  _expandable: {
    container?: string
    metadata?: string
    extensions?: string
    operations?: string
    children?: string
    restrictions?: string
    history?: string
    ancestors?: string
    body?: string
    version?: string
    descendants?: string
    space?: string
    relevantViewRestrictions?: string
    permissions?: string
    icon?: string
    description?: string
    retentionPolicy?: string
    homepage?: string
  }
}

export interface ConfluenceQueryResponseBase<T extends ConfluenceItemBase> {
  results: T[]
  start: number
  limit: number
  size: number
  _links: {
    self: string
    next?: string
    base: string
    context?: string
  }
}

export enum ConfluenceContentType {
  Page = 'page',
  Global = 'global',
}

export enum ConfluencePageStatus {
  Current = 'current',
  Archived = 'archived',
}
