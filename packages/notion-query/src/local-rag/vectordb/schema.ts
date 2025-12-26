import * as arrow from 'apache-arrow'

import type { DocumentMetadata, QueryResult, VectorChunk } from '../types.js'

/**
 * Defines the robust Arrow schema for the vector table.
 * This schema serves as the single source of truth for the table structure.
 * @returns {arrow.Schema} The Apache Arrow schema definition.
 */
export function getDocumentsSchema(): arrow.Schema {
  const metadataFields = [
    new arrow.Field('fileName', new arrow.Utf8(), false),
    new arrow.Field('fileSize', new arrow.Int32(), false),
    new arrow.Field('fileType', new arrow.Utf8(), false),
    new arrow.Field('language', new arrow.Utf8(), true),
    new arrow.Field('memoryType', new arrow.Utf8(), true),
    new arrow.Field('tags', new arrow.List(new arrow.Field('item', new arrow.Utf8(), false)), true),
    new arrow.Field('project', new arrow.Utf8(), true),
    new arrow.Field('expiresAt', new arrow.Utf8(), true),
    new arrow.Field('createdAt', new arrow.Utf8(), false),
    new arrow.Field('updatedAt', new arrow.Utf8(), false),
    new arrow.Field('sourceUrl', new arrow.Utf8(), true),
  ]

  return new arrow.Schema([
    new arrow.Field('id', new arrow.Utf8(), false),
    new arrow.Field('filePath', new arrow.Utf8(), false),
    new arrow.Field('chunkIndex', new arrow.Int32(), false),
    new arrow.Field('text', new arrow.Utf8(), false),
    new arrow.Field('vector', new arrow.FixedSizeList(384, new arrow.Field('item', new arrow.Float32(), false)), false),
    new arrow.Field('metadata', new arrow.Struct(metadataFields), true),
    new arrow.Field('timestamp', new arrow.Utf8(), false),
  ])
}

/**
 * A utility class for safely mapping raw database records to strictly-typed application objects.
 * Handles type conversions and guards against undefined or malformed data.
 */
export class DataMapper {
  /**
   * Safely converts a raw metadata object from the database into a strict DocumentMetadata type.
   * @param raw - The raw metadata object, typically from a LanceDB record.
   * @returns A structured DocumentMetadata object.
   */
  public static toDocumentMetadata(raw: unknown): DocumentMetadata {
    const data = raw as Record<string, unknown>
    // LanceDB can return Arrow vectors for lists, so we need to safely convert them.
    const rawTags = data.tags as unknown
    let tags: string[] = []
    if (Array.isArray(rawTags)) {
      tags = rawTags
    } else if (rawTags && typeof (rawTags as { toArray?: () => string[] }).toArray === 'function') {
      tags = (rawTags as { toArray: () => string[] }).toArray()
    }

    return {
      fileName: String(data.fileName ?? ''),
      fileSize: typeof data.fileSize === 'number' ? data.fileSize : 0,
      fileType: String(data.fileType ?? ''),
      language: typeof data.language === 'string' ? data.language : undefined,
      tags,
      project: typeof data.project === 'string' ? data.project : undefined,
      memoryType:
        data.memoryType === 'text' || data.memoryType === 'file' || data.memoryType === 'url'
          ? data.memoryType
          : undefined,
      expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
      createdAt: String(data.createdAt ?? new Date().toISOString()),
      updatedAt: String(data.updatedAt ?? new Date().toISOString()),
      sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : undefined,
    }
  }

  /**
   * Converts a raw database record into a QueryResult object.
   * @param raw - The raw database record.
   * @returns A structured QueryResult object.
   */
  public static toQueryResult(raw: Record<string, unknown>): QueryResult {
    return {
      filePath: String(raw.filePath ?? ''),
      chunkIndex: raw.chunkIndex as number,
      text: String(raw.text ?? ''),
      score: raw._distance as number,
      metadata: DataMapper.toDocumentMetadata(raw.metadata),
    }
  }

  /**
   * Converts a raw database record into a VectorChunk object.
   * @param raw - The raw database record.
   * @returns A structured VectorChunk object.
   */
  public static toVectorChunk(raw: Record<string, unknown>): VectorChunk {
    return {
      id: String(raw.id ?? ''),
      filePath: String(raw.filePath ?? ''),
      chunkIndex: raw.chunkIndex as number,
      text: String(raw.text ?? ''),
      vector: Array.from((raw.vector as Float32Array) ?? []),
      metadata: this.toDocumentMetadata(raw.metadata),
      timestamp: String(raw.timestamp ?? ''),
    }
  }
}
