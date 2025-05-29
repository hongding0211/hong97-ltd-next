import { useRef } from 'react'

export function useOnce<T>(fn: () => T) {
  let res: any

  const isRun = useRef(false)

  if (!isRun.current) {
    res = fn()
    isRun.current = true
  }

  return res
}
