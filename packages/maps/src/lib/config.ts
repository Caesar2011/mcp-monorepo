let stadiaApiKey: string | undefined

/**
 * Initializes the Stadia Maps API key from the environment variable.
 * Throws an error if the key is not set, preventing server startup.
 * This should be called in the onReady hook of the server.
 */
export function initializeApiKey(): void {
  const apiKey = process.env.STADIA_API_KEY
  if (!apiKey) {
    throw new Error('Required environment variable STADIA_API_KEY is not set.')
  }
  stadiaApiKey = apiKey
}

/**
 * Retrieves the initialized Stadia Maps API key.
 * @returns The API key string.
 */
export function getStadiaApiKey(): string {
  if (!stadiaApiKey) {
    // This state is only reachable if initializeApiKey() has not been called,
    // which is prevented by the onReady hook in a normal run.
    throw new Error('Stadia Maps API key has not been initialized.')
  }
  return stadiaApiKey
}
