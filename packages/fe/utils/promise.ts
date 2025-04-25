interface PromiseWithCallbacks<T> {
  promise: Promise<T>
  onFulfilled?: (value: T) => void
  onRejected?: (reason: any) => void
}

export async function executePromisesWithLimit<T>(
  promiseObjects: {
    promise: Promise<T>
    onFulfilled?: (value: T) => void
    onRejected?: (reason: any) => void
  }[],
  limit: number,
): Promise<void> {
  const results: (T | Error)[] = []
  const executing: Promise<void>[] = []
  const iterator = promiseObjects.entries()

  const runPromise = async ([index, { promise, onFulfilled, onRejected }]: [
    number,
    PromiseWithCallbacks<T>,
  ]): Promise<void> => {
    try {
      const value = await promise
      results[index] = value
      onFulfilled?.(value)
    } catch (error) {
      results[index] = error instanceof Error ? error : new Error(String(error))
      onRejected?.(error)
    }
  }

  const executeNext = async (): Promise<void> => {
    const next = iterator.next()
    if (next.done) return

    const promiseExecution = runPromise(next.value)
    executing.push(promiseExecution)

    // Remove the promise from executing array when it completes
    promiseExecution.then(() => {
      executing.splice(executing.indexOf(promiseExecution), 1)
    })

    // If we've reached the limit, wait for one to finish before continuing
    if (executing.length >= limit) {
      await Promise.race(executing)
    }

    // Continue executing promises
    await executeNext()
  }

  // Start executing promises up to the limit
  await Promise.all(
    Array.from({ length: Math.min(limit, promiseObjects.length) }, () =>
      executeNext(),
    ),
  )
}
