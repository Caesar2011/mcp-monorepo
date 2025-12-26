import { parentPort, workerData } from 'node:worker_threads'

import { EmbeddingService } from './embedder.service.js'
import { type EmbeddingResult, type EmbeddingTask, type SerializedError } from './utils/pool.js'

if (!parentPort) throw new Error('This script must be run as a worker thread.')

const embeddingService = new EmbeddingService()
const { modelPath, cacheDir } = workerData as { modelPath: string; cacheDir: string }
const initPromise = embeddingService.ensureInitialized(modelPath, cacheDir)

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack, cause: error.cause }
  }
  return { name: 'UnknownError', message: String(error) }
}

parentPort.on('message', async (data: { task: EmbeddingTask; taskId: number }) => {
  const { task, taskId } = data
  try {
    await initPromise
    if (task.type === 'embed') {
      const vector = await embeddingService.embed(task.payload.text)
      const result = { taskId, status: 'success', result: vector }
      parentPort?.postMessage(result)
    } else if (task.type === 'embedBatch') {
      const vectors = await embeddingService.embed(task.payload.texts)
      const result = { taskId, status: 'success', result: vectors }
      parentPort?.postMessage(result)
    }
  } catch (e) {
    const result: EmbeddingResult = { taskId, status: 'error', error: serializeError(e) }
    parentPort?.postMessage(result)
  }
})
