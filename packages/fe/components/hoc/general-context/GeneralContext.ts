import { NextRouter } from 'next/router'
import { createContext } from 'react'

interface IGeneralContext {
  router?: NextRouter
}

const DEFAULT_VALUE: IGeneralContext = {}

export const GeneralContext = createContext<IGeneralContext>(DEFAULT_VALUE)
