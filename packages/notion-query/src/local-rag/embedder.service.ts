import { env, type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers'
import { logger } from '@mcp-monorepo/shared'

import { EmbeddingError } from './errors.js'

export class EmbeddingService {
  private model: FeatureExtractionPipeline | undefined = undefined
  private initPromise: Promise<void> | undefined = undefined

  /**
   * Static method to ensure the model is downloaded to the cache directory.
   * This should be called from the main thread before any workers are created
   * to prevent a download race condition.
   */
  public static async primeCache(modelPath: string, cacheDir: string): Promise<void> {
    try {
      env.cacheDir = cacheDir
      logger.info(`Main thread: Priming model cache for "${modelPath}"...`)

      // We call pipeline() here just to trigger the download if the model is not cached.
      // The returned pipeline instance is discarded as we don't need it in the main thread.
      await EmbeddingService.getFeatureExtractionPipeline(modelPath, {
        progress_callback: (info) => {
          if (info.status === 'progress') logger.info(`Downloading model: ${info.file} [${Math.round(info.progress)}%]`)
        },
        dtype: 'fp32',
      })
      logger.info('Main thread: Model cache is ready.')
    } catch (error) {
      throw new EmbeddingError('Main thread failed to prime the model cache.', error)
    }
  }

  public async ensureInitialized(modelPath: string, cacheDir: string): Promise<void> {
    if (this.model) return
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      try {
        env.cacheDir = cacheDir
        this.model = await EmbeddingService.getFeatureExtractionPipeline(modelPath, {
          dtype: 'fp32',
        })
      } catch (error) {
        this.initPromise = undefined
        throw new EmbeddingError(`Worker failed to initialize embedding model.`, error)
      }
    })()
    return this.initPromise
  }

  public async embed(text: string): Promise<number[]>
  public async embed(text: string[]): Promise<number[][]>
  public async embed(text: string | string[]): Promise<number[] | number[][]> {
    if (!this.model) {
      throw new EmbeddingError('Worker model not available. ensureInitialized must be called first.')
    }
    const texts = Array.isArray(text) ? text : [text]
    if (texts.some((t) => t.trim().length === 0)) {
      throw new EmbeddingError('Cannot generate embedding for empty text.')
    }

    try {
      const output = await this.model(texts, { pooling: 'mean', normalize: true })
      // The output shape depends on whether the input was a single string or an array.
      // We normalize it to always be an array of vectors for consistency.
      if (!Array.isArray(text)) {
        // Input was a single string, result is a 1D tensor represented as a 2D array [1, dim]
        return Array.from(output.data as Float32Array)
      } else {
        // Input was an array, result is a 2D tensor. We need to slice it.
        const vectors: number[][] = []
        const vectorSize = output.dims[1]
        if (vectorSize !== 384) throw new EmbeddingError(`Unexpected vector size. Expected 384, got ${vectorSize}.`)
        const flatData = output.data as Float32Array
        for (let i = 0; i < output.dims[0]; i++) {
          vectors.push(Array.from(flatData.slice(i * vectorSize, (i + 1) * vectorSize)))
        }
        return vectors
      }
    } catch (error) {
      throw new EmbeddingError('Worker failed to generate embedding for text.', error)
    }
  }

  private static getFeatureExtractionPipeline = (
    model: string,
    opts?: Parameters<typeof pipeline>[2],
  ): Promise<FeatureExtractionPipeline> => {
    return pipeline<'feature-extraction'>('feature-extraction', model, opts)
  }
}
