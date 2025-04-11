const isClient = typeof window !== 'undefined'

export function runOnClient<T>(fn: () => T) {
  if (!isClient) {
    return undefined
  }

  return fn()
}

export function useOnlyOnClient<T>(fn: () => T) {
  if (!isClient) {
    return undefined
  }

  return fn()
}
