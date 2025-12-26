import { EmbeddingService } from './embedder.service.js'
import { EmbeddingError } from './errors.js'
import { WorkerPool, type EmbeddingTask } from './utils/pool.js'

import type { PoolConfig } from './types.js'

export interface EmbedderConfig {
  modelPath: string
  /**
   * The number of texts to process in a single batch sent to a worker.
   * @default 32
   **/
  batchSize?: number
  cacheDir: string
  poolConfig?: PoolConfig
}

/**
 * Manages the embedding process by offloading the CPU-intensive work to a pool of worker threads.
 * This class acts as a proxy to the actual embedding logic, keeping the main thread non-blocking.
 */
export class Embedder {
  private readonly pool: WorkerPool
  private readonly batchSize: number

  private constructor(config: EmbedderConfig, pool: WorkerPool) {
    this.batchSize = config.batchSize ?? 32
    this.pool = pool
  }

  /**
   * Creates and initializes an Embedder instance.
   * It ensures the model is downloaded and cached before creating worker threads.
   */
  public static async create(config: EmbedderConfig): Promise<Embedder> {
    await EmbeddingService.primeCache(config.modelPath, config.cacheDir)

    const workerPath = new URL('./embedder.worker.js', import.meta.url)

    const pool = new WorkerPool(
      workerPath,
      {
        modelPath: config.modelPath,
        cacheDir: config.cacheDir,
      },
      config.poolConfig,
    )

    return new Embedder(config, pool)
  }

  /**
   * Generates an embedding vector for a single string of text.
   * @param text The text to embed.
   * @returns A promise that resolves to a numeric vector.
   */
  public async embed(text: string): Promise<number[]> {
    if (text.trim().length === 0) {
      throw new EmbeddingError('Cannot generate embedding for empty text.')
    }
    const task: EmbeddingTask = {
      type: 'embed',
      payload: { text },
    }
    return this.pool.runTask(task)
  }

  /**
   * Generates embedding vectors for an array of texts in batches using the worker pool.
   * This is much more efficient than calling `embed` for each text individually.
   * @param texts An array of texts to embed.
   * @returns A promise that resolves to an array of numeric vectors.
   */
  public async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return []
    }

    const batches: string[][] = []
    for (let i = 0; i < texts.length; i += this.batchSize) {
      batches.push(texts.slice(i, i + this.batchSize))
    }

    const batchPromises = batches.map((batch) => {
      const task: EmbeddingTask = {
        type: 'embedBatch',
        payload: { texts: batch },
      }
      return this.pool.runTask(task) as Promise<number[][]>
    })

    const results = await Promise.all(batchPromises)
    return results.flat()
  }

  /**
   * Gracefully shuts down all worker threads.
   */
  public async destroy(): Promise<void> {
    await this.pool.destroy()
  }
}
