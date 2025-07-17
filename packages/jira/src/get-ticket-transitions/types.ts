/**
 * Types for get-ticket-transitions tool
 */

export interface GetTicketTransitionsParams {
  issueIdOrKey: string
}

export interface JiraTransition {
  id: string
  name: string
  to: {
    self: string
    description: string
    iconUrl: string
    name: string
    id: string
    statusCategory: {
      self: string
      id: number
      key: string
      colorName: string
      name: string
    }
  }
  hasFields: boolean
  isGlobal: boolean
  isInitial: boolean
}

export interface JiraTransitionsResponse {
  expand?: string
  transitions: JiraTransition[]
}
