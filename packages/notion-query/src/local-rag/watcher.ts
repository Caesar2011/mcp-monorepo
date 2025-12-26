import { extname } from 'node:path'

import { logger } from '@mcp-monorepo/shared'
import { FSWatcher } from 'chokidar'

import { TypedEventEmitter } from './utils/typed-emitter.js'

/**
 * Defines the events that the DirectoryWatcher can emit.
 * The key is the event name, and the value is an array of argument types for the listener.
 */
type WatcherEvents = {
  'file-added': [filePath: string]
  'file-changed': [filePath: string]
  'file-deleted': [filePath: string]
}

/**
 * A robust file system watcher that abstracts away the complexities of chokidar.
 * It debounces change events and only reports on supported file types, emitting clean,
 * actionable events.
 */
export class DirectoryWatcher extends TypedEventEmitter<WatcherEvents> {
  private readonly watcher: FSWatcher
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>()
  private readonly debounceMs: number
  private readonly supportedExtensions: Set<string>

  constructor(debounceMs: number, supportedExtensions: string[]) {
    super()
    this.debounceMs = debounceMs
    this.supportedExtensions = new Set(supportedExtensions)

    this.watcher = new FSWatcher({
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't fire 'add' events on initial scan
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    })

    this.setupListeners()
  }

  private setupListeners(): void {
    this.watcher
      .on('add', (path) => this.handleFileEvent(path, 'file-added'))
      .on('change', (path) => this.handleFileEvent(path, 'file-changed'))
      .on('unlink', (path) => this.handleFileEvent(path, 'file-deleted'))
      .on('error', (error) => logger.error(`Watcher error: ${error}`))
  }

  private isSupported(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase()
    return this.supportedExtensions.has(ext)
  }

  private handleFileEvent(filePath: string, event: keyof WatcherEvents): void {
    if (!this.isSupported(filePath)) {
      return // Ignore unsupported file types
    }

    // Clear any existing timer to debounce rapid changes
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath))
      this.debounceTimers.delete(filePath)
    }

    // For deletions, we want to act immediately.
    if (event === 'file-deleted') {
      logger.info(`Watcher: Detected deletion for: ${filePath}`)
      this.emit('file-deleted', filePath)
      return
    }

    // For adds and changes, debounce the event to avoid churn.
    const timer = setTimeout(() => {
      logger.info(`Watcher: Detected ${event === 'file-added' ? 'addition' : 'change'} for: ${filePath}`)
      this.emit(event, filePath)
      this.debounceTimers.delete(filePath)
    }, this.debounceMs)

    this.debounceTimers.set(filePath, timer)
  }

  /**
   * Starts watching a given path (file or directory).
   * @param path - The path to watch.
   */
  public watch(path: string): void {
    this.watcher.add(path)
  }

  /**
   * Stops watching a given path.
   * @param path - The path to unwatch.
   */
  public unwatch(path: string): void {
    this.watcher.unwatch(path)
  }

  /**
   * Gracefully shuts down the watcher, releasing all file system handles.
   */
  public async close(): Promise<void> {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
    await this.watcher.close()
  }
}
