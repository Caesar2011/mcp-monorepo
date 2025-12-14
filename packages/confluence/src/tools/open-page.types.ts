import { type ConfluenceItemBase } from '../lib/types.js'

export interface ConfluencePageWithBodyResponse extends ConfluenceItemBase {
  title: string
  position: number
  body: {
    storage: {
      value: string
      representation: string
      _expandable: {
        content: string
      }
    }
    _expandable: {
      editor?: string
      view?: string
      export_view?: string
      styled_view?: string
      anonymous_export_view?: string
    }
  }
  extensions: {
    position: string
  }
}
