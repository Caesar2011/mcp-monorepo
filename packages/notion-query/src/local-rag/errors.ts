/**
 * Represents an error due to invalid user input or configuration.
 * Maps to a 400 Bad Request in a server context.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Represents an error during a file system operation.
 * Maps to a 500 Internal Server Error in a server context.
 */
export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'FileOperationError'
  }
}

/**
 * Represents an error related to the embedding model.
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'EmbeddingError'
  }
}

/**
 * Represents an error related to the vector database.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}
