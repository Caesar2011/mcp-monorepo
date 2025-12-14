export interface BaseChannel {
  id: string
  name: string
  is_group: true
  is_im: false
  created: number
  creator: string
  is_archived: boolean
  is_general: boolean
  unlinked: number
  name_normalized: string
  is_shared: boolean
  is_ext_shared: boolean
  is_org_shared: boolean
  pending_shared: unknown[]
  is_pending_ext_shared: boolean
  is_private: boolean
  topic?: {
    value: string
    creator: string
    last_set: number
  }
  purpose?: {
    value: string
    creator: string
    last_set: number
  }
}

export interface Channel extends BaseChannel {
  is_channel: true
  is_mpim: false
  previous_names: string[]
}

export interface MpIM extends BaseChannel {
  is_channel: false
  is_mpim: true
  is_open: boolean
  priority: number
}

export interface IM {
  id: string
  created: number
  is_im: true
  is_org_shared: boolean
  user: string
  is_user_deleted: boolean
  priority: number
}

export type AnyChannel = IM | Channel | MpIM
