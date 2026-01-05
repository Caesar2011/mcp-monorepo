/**
 * Base class for all custom errors thrown by the SDK.
 */
export class UrbanSportsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrbanSportsError'
  }
}

/**
 * Thrown when an authentication attempt fails (e.g., wrong credentials)
 * or when a required authenticated session becomes invalid.
 */
export class AuthenticationError extends UrbanSportsError {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Thrown when an HTTP request fails with a non-2xx status code
 * (after handling retries for 403).
 */
export class HttpError extends UrbanSportsError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly url: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * Thrown when the API response is not in the expected format,
 * making it impossible to parse.
 */
export class ParsingError extends UrbanSportsError {
  constructor(message: string) {
    super(message)
    this.name = 'ParsingError'
  }
}
