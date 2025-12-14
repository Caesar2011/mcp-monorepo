import { type ConfluenceItemBase, type ConfluenceQueryResponseBase } from '../lib/types.js'

export interface SearchSqlTypes extends ConfluenceQueryResponseBase<SearchResult> {
  cqlQuery: string
  searchDuration: number
  totalSize: number
}

export interface SearchResult extends ConfluenceItemBase {
  title?: string
  name?: string
  key?: string
  position: number
  restrictions: Record<string, unknown>
}
