/**
 * Output formatting for get-ticket-transitions tool
 */
import type { JiraTransitionsResponse } from './types.js'

export function formatTransitionsResponse(status: number, data?: JiraTransitionsResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  if (!data.transitions?.length) return `HTTP ${status} (no transitions found)`
  const transitions = data.transitions.map((t) => `- ${t.name} (id: ${t.id}) → ${t.to.name}`)
  return [`HTTP ${status}`, `Transitions:`, ...transitions].join('\n')
}

export function formatTransitionsError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error getting transitions: ${message}`
}
