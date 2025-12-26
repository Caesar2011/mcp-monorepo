import { readFile, stat } from 'node:fs/promises'
import { extname, isAbsolute, resolve } from 'node:path'

import mammoth from 'mammoth'
import * as Parse from 'papaparse'
import { PDFParse } from 'pdf-parse'

import { FileOperationError, ValidationError } from './errors.js'

import type { DocumentMetadata } from './types.js'

/**
 * Supported code file extensions mapped to a language name.
 */
const CODE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.sh': 'bash',
  '.sql': 'sql',
  '.json': 'json',
  '.csv': 'csv',
} as const

export interface ParserConfig {
  baseDir: string
  maxFileSize: number
}

export interface ParsedFile {
  text: string
  language?: string
  fileSize: number
  metadata: Partial<DocumentMetadata>
}

/**
 * Parses text content from various file formats.
 * Extracts basic metadata and transforms structured content for better RAG performance.
 */
export class DocumentParser {
  private readonly config: ParserConfig

  constructor(config: ParserConfig) {
    this.config = config
  }

  /**
   * Parses a file, automatically detecting its format.
   * @param filePath - The path to the file to parse.
   * @returns The extracted text, detected language (for code files), and file size.
   */
  public async parseFile(filePath: string): Promise<ParsedFile> {
    this.validateFilePath(filePath)
    const { fileSize, fileCreatedAt, fileModifiedAt } = await this.validateAndGetFileStats(filePath)

    const baseMetadata: Partial<DocumentMetadata> = { fileCreatedAt, fileModifiedAt }
    const ext = extname(filePath).toLowerCase()
    const language = this.detectLanguage(filePath)

    let parsedContent: { text: string; metadata?: Partial<DocumentMetadata> }

    if (language && !['.json', '.csv'].includes(ext)) {
      parsedContent = { text: await this.parseAsPlainText(filePath) }
    } else {
      switch (ext) {
        case '.pdf':
          parsedContent = await this.parsePdf(filePath)
          break
        case '.docx':
          parsedContent = await this.parseDocx(filePath)
          break
        case '.json':
          parsedContent = { text: await this.parseJson(filePath) }
          break
        case '.csv':
          parsedContent = { text: await this.parseStructuredCsv(filePath) }
          break
        case '.txt':
        case '.md':
        case '.markdown':
          parsedContent = { text: await this.parseAsPlainText(filePath) }
          break
        default:
          throw new ValidationError(`Unsupported file format: ${ext}`)
      }
    }

    return {
      text: parsedContent.text,
      language,
      fileSize,
      metadata: { ...baseMetadata, ...parsedContent.metadata },
    }
  }

  /**
   * Returns a list of all supported file extensions.
   * @returns An array of file extensions (e.g., ['.pdf', '.ts', '.md']).
   */
  public getSupportedExtensions(): string[] {
    const documentExts = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.json', '.csv']
    const codeExts = Object.keys(CODE_EXTENSIONS)
    return [...new Set([...documentExts, ...codeExts])]
  }

  /**
   * Validates that a file path is absolute and within the configured `baseDir`.
   * @param filePath - The absolute path to validate.
   * @throws {ValidationError} If the path is invalid or outside the security boundary.
   */
  public validateFilePath(filePath: string): void {
    if (!isAbsolute(filePath)) {
      throw new ValidationError(`File path must be absolute. Received: ${filePath}`)
    }

    const baseDir = resolve(this.config.baseDir)
    const normalizedPath = resolve(filePath)

    if (!normalizedPath.startsWith(baseDir)) {
      throw new ValidationError(`File path is outside the allowed base directory. Base: ${baseDir}, Path: ${filePath}`)
    }
  }

  /**
   * Validates that a file's size is within the configured limit.
   * @param filePath - The path to the file to check.
   * @returns The file size in bytes.
   * @throws {ValidationError} If the file is too large.
   * @throws {FileOperationError} If the file stats cannot be read.
   */
  public async validateAndGetFileStats(
    filePath: string,
  ): Promise<{ fileSize: number; fileCreatedAt: string; fileModifiedAt: string }> {
    try {
      const stats = await stat(filePath)
      if (stats.size > this.config.maxFileSize) {
        throw new ValidationError(`File size ${stats.size} exceeds limit of ${this.config.maxFileSize} bytes.`)
      }
      return {
        fileSize: stats.size,
        fileCreatedAt: stats.birthtime.toISOString(),
        fileModifiedAt: stats.mtime.toISOString(),
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new FileOperationError(`Failed to get file stats: ${filePath}`, error)
    }
  }

  private detectLanguage(filePath: string): string | undefined {
    return CODE_EXTENSIONS[extname(filePath).toLowerCase()]
  }

  private async parsePdf(filePath: string): Promise<{ text: string; metadata: Partial<DocumentMetadata> }> {
    try {
      const buffer = await readFile(filePath)
      const pdf = new PDFParse({ data: buffer })
      const data = await pdf.getText()
      const info = await pdf.getInfo()
      const author = (info.info as Record<string, string>).Author?.trim()
      return { text: data.text, metadata: { author } }
    } catch (error) {
      throw new FileOperationError(`Failed to parse PDF: ${filePath}`, error)
    }
  }

  private async parseDocx(filePath: string): Promise<{ text: string; metadata: Partial<DocumentMetadata> }> {
    try {
      // Note: mammoth.extractRawText does not support metadata extraction (e.g., author).
      // A more complex setup would be needed to get this information.
      const { value } = await mammoth.extractRawText({ path: filePath })
      return { text: value, metadata: {} }
    } catch (error) {
      throw new FileOperationError(`Failed to parse DOCX: ${filePath}`, error)
    }
  }

  private async parseJson(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      // Pretty-print the JSON to make it more readable for the LLM.
      return JSON.stringify(data, undefined, 2)
    } catch (error) {
      throw new FileOperationError(`Failed to parse JSON: ${filePath}`, error)
    }
  }

  /**
   * Parses CSV into a text format where each row preserves the header context.
   * This is crucial for the semantic meaning of chunks.
   */
  private async parseStructuredCsv(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const result = Parse.parse(content, { header: true, skipEmptyLines: true })

      if (result.errors.length > 0) {
        throw new Error(`CSV parsing errors: ${result.errors.map((e) => e.message).join(', ')}`)
      }

      // Convert each row object into a descriptive string.
      // E.g., { "name": "Alice", "age": 30 } becomes "name: Alice, age: 30"
      return result.data
        .map((row) =>
          Object.entries(row as Record<string, string>)
            .map(([key, value]) => `${key.trim()}: ${value?.trim() ?? ''}`)
            .join(', '),
        )
        .join('\n')
    } catch (error) {
      throw new FileOperationError(`Failed to parse CSV: ${filePath}`, error)
    }
  }

  private async parseAsPlainText(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8')
    } catch (error) {
      throw new FileOperationError(`Failed to read text file: ${filePath}`, error)
    }
  }
}
