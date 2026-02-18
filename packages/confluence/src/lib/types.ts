import { type ADFDocument } from './adf-utils.js'

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

// ========================================
// V2 API Types
// ========================================

/**
 * V2 Cursor-based pagination response
 */
export interface ConfluenceV2PagedResponse<T> {
  results: T[]
  _links: {
    self?: string
    next?: string // Cursor URL for next page
    base?: string
  }
}

/**
 * V2 Page structure
 */
export interface ConfluenceV2Page {
  id: string
  status: string
  title: string
  spaceId: string
  parentId?: string
  authorId: string
  createdAt: string
  version: {
    number: number
    message?: string
    createdAt: string
  }
  body?: {
    storage?: {
      value: string
      representation: 'storage'
    }
    atlas_doc_format?: {
      value: ADFDocument
      representation: 'atlas_doc_format'
    }
  }
  _links: {
    webui: string
    editui?: string
    tinyui: string
  }
}

/**
 * V2 Space structure
 */
export interface ConfluenceV2Space {
  id: string
  key: string
  name: string
  type: string
  status: string
  authorId: string
  createdAt: string
  _links: {
    webui: string
  }
}

// ========================================
// Unified Interface (abstracts v1/v2)
// ========================================

/**
 * Unified page interface that works across both API versions
 * Service layer normalizes v1/v2 responses to this format
 */
export interface ConfluencePage {
  id: string
  title: string
  spaceKey: string // Always use key (service layer resolves from v2's spaceId)
  parentId?: string
  webUrl: string
  content?: string // Markdown for v2 (converted from ADF), storage HTML for v1
  version: number
  createdAt?: string
  updatedAt?: string
}

/**
 * Unified space interface
 */
export interface ConfluenceSpace {
  id: string
  key: string
  name: string
  type: string
  webUrl: string
}

/**
 * Unified pagination result
 */
export interface PagedResult<T> {
  results: T[]
  nextCursor?: string // v2 cursor
  nextStart?: number // v1 offset
  hasMore: boolean
}
