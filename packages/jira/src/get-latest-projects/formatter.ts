/**
 * Output formatting for get-latest-projects tool
 */
import type { JiraProjectsListResponse } from './types.js'

export function formatProjectsResponse(status: number, data?: JiraProjectsListResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  const projects = data.values?.map((project) => `- ${project.key}: ${project.name}`)
  return [`HTTP ${status}`, `Total: ${data.total}`, ...(projects?.length ? projects : ['No projects found'])].join('\n')
}

export function formatProjectsError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error getting latest projects: ${message}`
}
