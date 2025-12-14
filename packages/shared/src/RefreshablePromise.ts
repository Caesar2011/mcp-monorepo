import { type MaybePromise } from './types.js'

type FetchFunction<T> = () => MaybePromise<T>

type State<T> =
  | {
      state: 'initial'
    }
  | {
      state: 'pending'
    }
  | {
      state: 'fulfilled'
      value: T
    }
  | {
      state: 'rejected'
      error: unknown
    }

export class RefreshablePromise<T> implements PromiseLike<T> {
  private resolvers: ((value: T) => void)[] = []
  private rejectors: ((reason: unknown) => void)[] = []
  private fetchFunction: FetchFunction<T>
  private state: State<T> = { state: 'initial' }

  constructor(fetchFunction: FetchFunction<T>, initialValue?: T) {
    this.fetchFunction = fetchFunction

    if (initialValue !== undefined) {
      this.state = {
        state: 'fulfilled',
        value: initialValue,
      }
    } else {
      this.refresh()
    }
  }

  then<TResult1 = T, TResult2 = TResult1>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1> {
    return new Promise<TResult1>((resolve, reject) => {
      const executeHandler = <TResult>(
        handler: ((value: T) => TResult | PromiseLike<TResult>) | null | undefined,
        value: unknown,
        fallback: (value: unknown) => void,
      ) => {
        if (!handler) {
          fallback(value)
          return
        }

        try {
          resolve(handler(value as T) as TResult1)
        } catch (error) {
          reject(error)
        }
      }

      const fulfillWrapper = (value: T) => executeHandler(onFulfilled, value, resolve as never)
      const rejectWrapper = (reason: unknown) => executeHandler(onRejected, reason, reject)

      if (this.state.state === 'fulfilled') {
        const value = this.state.value
        queueMicrotask(() => fulfillWrapper(value))
      } else if (this.state.state === 'rejected') {
        const error = this.state.error
        queueMicrotask(() => rejectWrapper(error))
      } else {
        this.resolvers.push(fulfillWrapper)
        this.rejectors.push(rejectWrapper)
      }
    })
  }

  async refresh(): Promise<T> {
    if (this.state.state === 'pending') {
      return new Promise<T>((resolve, reject) => {
        this.resolvers.push(resolve)
        this.rejectors.push(reject)
      })
    }

    this.state = {
      state: 'pending',
    }

    try {
      const result = await this.fetchFunction()
      this.state = {
        state: 'fulfilled',
        value: result,
      }
      this._notifyHandlers(this.resolvers, result)
      return result
    } catch (error) {
      this.state = {
        state: 'rejected',
        error: error,
      }
      this._notifyHandlers(this.rejectors, error)
      throw error
    }
  }

  private _notifyHandlers<TValue>(handlers: ((value: TValue) => void)[], value: TValue): void {
    const handlersToNotify = [...handlers]
    this.resolvers = []
    this.rejectors = []
    handlersToNotify.forEach((handler) => handler(value))
  }

  catch<TResult = never>(
    onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined,
  ): PromiseLike<T | TResult> {
    return this.then(undefined, onRejected)
  }

  finally(onFinally?: (() => void) | null | undefined): PromiseLike<T> {
    return this.then(
      (value) => {
        onFinally?.()
        return value
      },
      (reason) => {
        onFinally?.()
        throw reason
      },
    )
  }
}
