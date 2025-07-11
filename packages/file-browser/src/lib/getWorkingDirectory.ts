import { resolve } from 'path'

export const getWorkingDirectory = (): string => {
  // 1. ENV-Variante bevorzugen
  const envDir = process.env.WORKING_DIR
  if (envDir && envDir.trim() !== '') {
    return resolve(envDir)
  }

  // 2. Fallback: Argument wie bisher
  const workingDir = process.argv[2]
  if (!workingDir) {
    console.error(
      'Error: Working directory not provided as argument or WORKING_DIR env. Usage: node <mcp-file> <working_directory> or set WORKING_DIR',
    )
    process.exit(1)
  }
  return resolve(workingDir)
}
