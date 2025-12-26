type Listener<T extends unknown[]> = (...args: T) => void

/**
 * A generic, type-safe event emitter.
 * Ensures that event names and their payload types are strictly checked at compile time.
 * @template T - A map of event names to their listener argument types.
 */
export class TypedEventEmitter<T extends Record<string, unknown[]>> {
  private readonly listeners = new Map<keyof T, Listener<T[keyof T]>[]>()

  /**
   * Registers an event listener for a given event.
   * @param event - The name of the event to listen for.
   * @param listener - The callback function to execute when the event is emitted.
   */
  public on<E extends keyof T>(event: E, listener: Listener<T[E]>): void {
    const existing = this.listeners.get(event) ?? []
    // @ts-expect-error Undefined subtype
    this.listeners.set(event, [...existing, listener])
  }

  /**
   * Emits an event, calling all registered listeners with the provided arguments.
   * @param event - The name of the event to emit.
   * @param args - The arguments to pass to the event listeners.
   */
  public emit<E extends keyof T>(event: E, ...args: T[E]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(...args)
      }
    }
  }

  /**
   * Removes all listeners, or all listeners for a specific event.
   * @param event - Optional. The name of the event to remove listeners for.
   */
  public off<E extends keyof T>(event?: E): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}
