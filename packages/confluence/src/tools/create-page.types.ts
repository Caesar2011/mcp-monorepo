import { type ConfluenceItemBase } from '../lib/types.js'

export interface ConfluenceCreatePageResponse extends ConfluenceItemBase {
  title: string
  space: {
    key: string
    name: string
    _expandable?: Record<string, string | undefined>
  }
  body: {
    storage: {
      value: string
      representation: string
    }
  }
  ancestors: Array<{
    id: string
  }>
}
