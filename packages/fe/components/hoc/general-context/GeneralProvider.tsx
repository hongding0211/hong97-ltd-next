import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { useAppStore } from '@stores/general'
import { ThemeProvider } from 'next-themes'
import { NextRouter } from 'next/router'
import React, { useEffect, useMemo } from 'react'
import { GeneralContext } from './GeneralContext'

interface IGeneralProviderProps {
  children: React.ReactNode
  router: NextRouter
  user?: UserResponseDto | null
}

export const GeneralProvider: React.FC<IGeneralProviderProps> = (props) => {
  const { children, router, user } = props

  const { init, cleanUp } = useAppStore((state) => ({
    init: state.init,
    cleanUp: state.cleanUp,
  }))

  const value = useMemo(
    () => ({
      router,
      user,
    }),
    [router, user],
  )

  useEffect(() => {
    init(user)
    return cleanUp
  }, [init, cleanUp, user])

  return (
    <GeneralContext.Provider value={value}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </GeneralContext.Provider>
  )
}
