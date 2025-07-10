// Format the success response for the rm tool
export const formatSuccessResponse = (deletedPaths: string[]): string => {
  return `Successfully deleted the following paths:\n${deletedPaths.join('\n')}`
}

// Format the error response for the rm tool
export const formatErrorResponse = (error: unknown): string => {
  return error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred.'
}
