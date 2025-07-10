export const formatSuccessResponse = (paths: string[]): string => {
  return `Successfully created the following directories:\n- ${paths.join('\n- ')}`
}

export const formatErrorResponse = (error: unknown): string => {
  return `Error: ${error instanceof Error ? error.message : String(error)}`
}
