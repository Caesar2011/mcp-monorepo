import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { logger } from '@mcp-monorepo/shared'

/**
 * Minimum chunk length in characters.
 * Chunks shorter than this are filtered out to reduce noise from document
 * artifacts like page numbers or isolated headings.
 * This rule does not apply if a document is so short that it only consists of a single chunk.
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
   * Splits a given text into an array of indexed chunks with intelligent filtering.
   * If a document is short and results in only one chunk, that chunk is always kept.
   * For multi-chunk documents, small, noisy chunks are filtered out.
   * @param text The input text to split.
   * @returns A promise that resolves to an array of text chunks.
   */
  public async chunkText(text: string): Promise<TextChunk[]> {
    if (!text?.trim()) {
      return []
    }

    try {
      const chunks = await this.splitter.splitText(text)

      // If the document is so short that it only produces one chunk,
      // we keep it, as it represents the entire content.
      if (chunks.length === 1) {
        return [
          {
            text: chunks[0],
            index: 0,
          },
        ]
      }

      // For multi-chunk documents, filter out small, noisy chunks to improve quality.
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
