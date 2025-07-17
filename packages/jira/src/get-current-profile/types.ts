/**
 * Type definitions for get-current-profile tool (Jira)
 */

// No input parameters
export type GetCurrentProfileParams = Record<string, never>

// Jira user profile response type (partial, for reference)
export interface JiraProfileResponse {
  self: string
  key: string
  accountId: string
  name: string
  emailAddress: string
  avatarUrls: Record<string, string>
  displayName: string
  active: boolean
  timeZone: string
  locale: string
  groups?: {
    size: number
    items: unknown[]
  }
  applicationRoles?: {
    size: number
    items: unknown[]
  }
  expand?: string
}
