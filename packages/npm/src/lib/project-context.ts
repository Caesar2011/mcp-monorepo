import { resolve } from 'path'

let workingDirectory: string | undefined

/**
 * Initializes the working directory for the server from the NPM_WORKING_DIRECTORY environment variable.
 * This must be called once at startup within the onReady hook.
 * It will throw an error if the required environment variable is not set, preventing server startup.
 */
export const initializeWorkingDirectory = (): void => {
  const workingDirEnv = process.env.NPM_WORKING_DIRECTORY
  if (!workingDirEnv) {
    throw new Error('Required environment variable NPM_WORKING_DIRECTORY is not set.')
  }
  // Resolve to an absolute path for consistency
  workingDirectory = resolve(workingDirEnv)
}

/**
 * Gets the initialized working directory.
 * @returns The absolute path to the working directory.
 */
export const getWorkingDirectory = (): string => {
  if (!workingDirectory) {
    // This state is not reachable in a normal run, as onReady validates the directory.
    // In TOOL_ADVISORY_ONLY mode, onReady is skipped, but so are tool fetchers, so this won't be called.
    throw new Error('Working directory has not been initialized.')
  }
  return workingDirectory
}
