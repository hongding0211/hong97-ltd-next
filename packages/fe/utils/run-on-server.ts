const isClient = typeof window !== 'undefined'

export function runOnServer<T>(fn: () => T) {
  if (isClient) {
    return undefined
  }

  return fn()
}

export function useOnlyOnServer<T>(fn: () => T) {
  if (isClient) {
    return undefined
  }

  return fn()
}
