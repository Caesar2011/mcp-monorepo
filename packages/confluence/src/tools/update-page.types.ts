import { type ConfluenceSpace } from './list-spaces.types.js'

import type { ConfluenceItemBase } from '../lib/types.js'

export interface ConfluencePageResponse extends ConfluenceItemBase {
  title: string
  space: ConfluenceSpace
  history: {
    latest: boolean
    createdBy: {
      type: string
      username: string
      userKey: string
      profilePicture: {
        path: string
        width: number
        height: number
        isDefault: boolean
      }
      displayName: string
      _links: {
        self: string
      }
      _expandable: {
        status?: string
      }
    }
    createdDate: string
    _links: {
      self: string
    }
    _expandable: {
      lastUpdated?: string
      previousVersion?: string
      contributors?: string
      nextVersion?: string
    }
  }
  version: {
    by: {
      type: string
      username: string
      userKey: string
      profilePicture: {
        path: string
        width: number
        height: number
        isDefault: boolean
      }
      displayName: string
      _links: {
        self: string
      }
      _expandable: {
        status?: string
      }
    }
    when: string
    number: number
    minorEdit: boolean
    hidden: boolean
    _links: {
      self: string
    }
    _expandable: {
      content?: string
    }
  }
  position: number
  extensions: {
    position: string
  }
}

export interface ConfluenceUpdatePageResponse extends ConfluenceItemBase {
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
