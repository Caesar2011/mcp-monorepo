import { resolve } from 'path'

export const getWorkingDirectory = (): string => {
  // The working directory is expected as the first argument after the script name
  const workingDir = process.argv[2]
  if (!workingDir) {
    console.error('Error: Working directory not provided as argument. Usage: node <mcp-file> <working_directory>')
    process.exit(1)
  }
  // Resolve to an absolute path for consistency
  return resolve(workingDir)
}
