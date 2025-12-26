import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { logger } from '@mcp-monorepo/shared'

/**
 * Minimum chunk length in characters.
 * Chunks shorter than this are filtered out to reduce noise from document
 * artifacts like page numbers or isolated headings.
 */
const MIN_CHUNK_LENGTH = 50

export interface ChunkerConfig {
  chunkSize: number
  chunkOverlap: number
}

export interface TextChunk {
  text: string
  index: number
}

/**
 * Splits text into overlapping chunks for embedding.
 */
export class DocumentChunker {
  private readonly splitter: RecursiveCharacterTextSplitter

  constructor(config: ChunkerConfig) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    })
  }

  /**
   * Splits a given text into an array of indexed chunks.
   * @param text The input text to split.
   * @returns A promise that resolves to an array of text chunks.
   */
  public async chunkText(text: string): Promise<TextChunk[]> {
    if (!text) {
      return []
    }

    try {
      const chunks = await this.splitter.splitText(text)

      // Filter out small, noisy chunks and map to the final structure.
      return chunks
        .filter((chunk) => chunk.length >= MIN_CHUNK_LENGTH)
        .map((chunk, index) => ({
          text: chunk,
          index,
        }))
    } catch (error) {
      logger.error('Failed to chunk text:', error)
      throw error // Re-throw to be handled by the caller
    }
  }
}
