import { logger } from './syslog/client.js'

/**
 * A type representing any function that returns a Promise.
 */
type ThrottledTask<T> = () => Promise<T>

/**
 * Provides a mechanism to execute asynchronous tasks (like API calls) sequentially
 * with a specified delay to enforce rate limiting or ensure serial execution.
 */
export class ThrottledExecutor {
  private taskQueue: (() => Promise<void>)[] = []
  private isProcessing = false
  private idlePromise: Promise<void> = Promise.resolve()
  private resolveIdle: () => void = () => {}

  constructor(private delayMs: number) {
    this.resolveIdle()
  }

  /**
   * Returns a promise that resolves when the queue is empty and all tasks are finished.
   * Useful for graceful shutdown procedures.
   */
  public onIdle(): Promise<void> {
    return this.idlePromise
  }

  /**
   * Enqueues an asynchronous function to be executed in a rate-limited manner.
   * @param task - A zero-argument function that returns a Promise with the result of the operation.
   * @returns A Promise that resolves with the result of the task once it's executed.
   * @template T The expected return type of the task's Promise.
   */
  public execute<T>(task: ThrottledTask<T>): Promise<T> {
    if (this.taskQueue.length === 0 && !this.isProcessing) {
      this.idlePromise = new Promise((resolve) => {
        this.resolveIdle = resolve
      })
    }

    return new Promise<T>((resolve, reject) => {
      this.taskQueue.push(() => task().then(resolve, reject))
      this.processQueue().catch((error: unknown) => {
        logger.error('Fatal error in ThrottledExecutor queue processing.', error)
      })
    })
  }

  /**
   * Internal method that processes the queue one task at a time, ensuring true sequential execution.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }
    this.isProcessing = true

    while (this.taskQueue.length > 0) {
      const nextInQueue = this.taskQueue.shift()
      if (nextInQueue) {
        await nextInQueue()

        await new Promise((res) => setTimeout(res, Math.max(0, this.delayMs)))
      }
    }

    this.isProcessing = false

    if (this.taskQueue.length === 0) {
      this.resolveIdle()
    }
  }
}
