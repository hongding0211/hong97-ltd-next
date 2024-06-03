import { NextRouter } from 'next/router'
import { createContext } from 'react'

interface IGeneralContext {
  darkModeEnabled: boolean
  setDarkModeEnabled: (value: boolean) => void
  router?: NextRouter
}

const DEFAULT_VALUE: IGeneralContext = {
  darkModeEnabled: false,
  setDarkModeEnabled: () => null,
}

export const GeneralContext = createContext<IGeneralContext>(DEFAULT_VALUE)
