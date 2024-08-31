import { createContext } from 'react'

interface DarkModeContext {
  currentValue: boolean
  setValue: (value: boolean) => void
}

const DEFAULT_VALUE: DarkModeContext = {
  currentValue: false,
  setValue: () => null,
}

export const DarkModeContext = createContext<DarkModeContext>(DEFAULT_VALUE)
