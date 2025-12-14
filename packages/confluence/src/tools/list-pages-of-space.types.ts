import { type ConfluenceItemBase, type ConfluenceQueryResponseBase } from '../lib/types.js'

export type ConfluenceListPagesResponse = ConfluenceQueryResponseBase<ConfluenceListPagesItem>

interface ConfluenceListPagesItem extends ConfluenceItemBase {
  title: string
  position: number
  extensions: {
    position: 'none' | number
  }
}
