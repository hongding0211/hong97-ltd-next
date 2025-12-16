import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { NextRouter } from 'next/router'
import { createContext } from 'react'

interface IGeneralContext {
  router?: NextRouter
  user?: UserResponseDto | null
}

const DEFAULT_VALUE: IGeneralContext = {}

export const GeneralContext = createContext<IGeneralContext>(DEFAULT_VALUE)
