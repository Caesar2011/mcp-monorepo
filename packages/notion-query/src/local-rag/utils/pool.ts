import { cpus } from 'node:os'
import { Worker } from 'node:worker_threads'

import { logger } from '@mcp-monorepo/shared'

import { EmbeddingError } from '../errors.js'

import type { PoolConfig } from '../types.js'

export interface SerializedError {
  name: string
  message: string
  stack?: string
  cause?: unknown
}
export type EmbeddingTask =
  | { type: 'embed'; payload: { text: string } }
  | { type: 'embedBatch'; payload: { texts: string[] } }

export type EmbeddingSuccess =
  | { taskId: number; status: 'success'; type: 'embed'; result: number[] }
  | { taskId: number; status: 'success'; type: 'embedBatch'; result: number[][] }

export type EmbeddingResult = EmbeddingSuccess | { taskId: number; status: 'error'; error: SerializedError }

type TaskInfo = {
  taskId: number
  task: EmbeddingTask
  resolve: (value: number[] | number[][]) => void
  reject: (reason?: unknown) => void
}

type TrackedWorker = {
  id: number // For logging purposes
  worker: Worker
  currentTaskId: number | undefined
  lastUsed: number
}

export class WorkerPool {
  private readonly workerPath: URL
  private readonly workerData: object
  private readonly config: Required<PoolConfig>

  private workers: TrackedWorker[] = []
  private readonly taskQueue: TaskInfo[] = []
  private taskIdCounter = 0
  private workerIdCounter = 0
  private readonly activeTasks = new Map<number, Pick<TaskInfo, 'resolve' | 'reject'>>()
  private idleCheckInterval: NodeJS.Timeout | undefined

  constructor(workerPath: URL, workerData: object, config: PoolConfig = {}) {
    this.workerPath = workerPath
    this.workerData = workerData

    this.config = {
      maxWorkers: config.maxWorkers ?? Math.max(1, cpus().length - 1),
      minWorkers: config.minWorkers ?? 0,
      idleTimeoutMs: config.idleTimeoutMs ?? 1_800_000,
    }

    if (this.config.idleTimeoutMs > 0) {
      this.idleCheckInterval = setInterval(() => this._reapIdleWorkers(), this.config.idleTimeoutMs / 2)
    }
  }

  public runTask(task: EmbeddingTask & { type: 'embed' }): Promise<number[]>
  public runTask(task: EmbeddingTask & { type: 'embedBatch' }): Promise<number[][]>
  public runTask(task: EmbeddingTask): Promise<number[] | number[][]> {
    const taskId = this.taskIdCounter++
    return new Promise((resolve, reject) => {
      this.activeTasks.set(taskId, { resolve, reject })
      this.taskQueue.push({ taskId, task, resolve, reject })
      this._dispatch()
    })
  }

  private _dispatch(): void {
    if (this.taskQueue.length === 0) {
      return
    }

    // 1. Prioritize using an existing idle worker
    const availableWorker = this.workers.find((w) => w.currentTaskId === undefined)
    if (availableWorker) {
      const taskInfo = this.taskQueue.shift()
      if (taskInfo) {
        this._assignTask(availableWorker, taskInfo)
      }
      return
    }

    // 2. If no idle worker, create a new one if we're not at the max limit
    if (this.workers.length < this.config.maxWorkers) {
      const taskInfo = this.taskQueue.shift()
      if (taskInfo) {
        logger.info(`Scaling up workers to ${this.workers.length + 1} to handle load...`)
        const newWorker = this._createWorker()
        this.workers.push(newWorker)
        this._assignTask(newWorker, taskInfo)
      }
    }

    // 3. If we are at the max limit and all workers are busy, the task remains queued.
    // It will be picked up when a worker finishes its current task.
  }

  private _createWorker(): TrackedWorker {
    const worker = new Worker(this.workerPath, { workerData: this.workerData })
    const trackedWorker: TrackedWorker = {
      id: ++this.workerIdCounter,
      worker,
      currentTaskId: undefined,
      lastUsed: Date.now(),
    }

    worker.on('message', (message: EmbeddingResult) => {
      this._handleTaskCompletion(trackedWorker, message)
    })

    worker.on('error', (err) => {
      this._handleWorkerCrash(trackedWorker, err)
    })

    return trackedWorker
  }

  private _assignTask(worker: TrackedWorker, taskInfo: TaskInfo): void {
    worker.currentTaskId = taskInfo.taskId
    worker.worker.postMessage({ task: taskInfo.task, taskId: taskInfo.taskId })
  }

  private _handleTaskCompletion(worker: TrackedWorker, message: EmbeddingResult): void {
    if (worker.currentTaskId === undefined) return // Should not happen

    const taskCallbacks = this.activeTasks.get(worker.currentTaskId)
    if (taskCallbacks) {
      if (message.status === 'success') {
        taskCallbacks.resolve(message.result)
      } else {
        taskCallbacks.reject(new EmbeddingError(message.error.message, message.error))
      }
      this.activeTasks.delete(worker.currentTaskId)
    }

    worker.currentTaskId = undefined
    worker.lastUsed = Date.now()

    // After finishing, check if there are more tasks to run.
    this._dispatch()
  }

  private _handleWorkerCrash(crashedWorker: TrackedWorker, err: Error): void {
    logger.error(`Worker #${crashedWorker.id} crashed.`, err)
    // Reject the task it was working on
    if (crashedWorker.currentTaskId !== undefined) {
      const taskCallbacks = this.activeTasks.get(crashedWorker.currentTaskId)
      taskCallbacks?.reject(new EmbeddingError(`Worker #${crashedWorker.id} crashed while processing task.`, err))
      this.activeTasks.delete(crashedWorker.currentTaskId)
    }

    // Remove the dead worker from the pool
    const workerIndex = this.workers.findIndex((w) => w.id === crashedWorker.id)
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1)
    }

    // Immediately try to dispatch another task, which may create a new worker if needed
    this._dispatch()
  }

  private _reapIdleWorkers(): void {
    const now = Date.now()
    const idleWorkers = this.workers.filter((w) => w.currentTaskId === undefined)

    for (const worker of idleWorkers) {
      if (this.workers.length <= this.config.minWorkers) {
        break // Stop reaping if we're at the minimum
      }

      if (now - worker.lastUsed > this.config.idleTimeoutMs) {
        logger.info(`Scaling down: Terminating idle worker #${worker.id}.`)
        worker.worker.terminate()
        const workerIndex = this.workers.findIndex((w) => w.id === worker.id)
        if (workerIndex !== -1) {
          this.workers.splice(workerIndex, 1)
        }
      }
    }
  }

  public async destroy(): Promise<void> {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
    }
    await Promise.all(this.workers.map((w) => w.worker.terminate()))
    this.workers = []
  }
}
