import { type ConfluenceItemBase, type ConfluenceQueryResponseBase } from '../lib/types.js'

export type ConfluenceListSpacesResponse = ConfluenceQueryResponseBase<ConfluenceSpace>

export interface ConfluenceSpace extends ConfluenceItemBase {
  key: string
  name: string
  creator: ConfluenceUser
  creationDate: string
  lastModifier: ConfluenceUser
  lastModificationDate: string
}

export interface ConfluenceUser {
  type: string
  username: string
  userKey: string
  displayName: string
  _links: {
    self: string
  }
  _expandable: {
    profilePicture?: string
    status?: string
  }
}
