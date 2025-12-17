import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { useAppStore } from '@stores/general'
import { ThemeProvider } from 'next-themes'
import { NextRouter } from 'next/router'
import React, { useEffect, useMemo } from 'react'
import { GeneralContext } from './GeneralContext'

interface IGeneralProviderProps {
  children: React.ReactNode
  router: NextRouter
  prefetchedUser?: UserResponseDto | null
}

export const GeneralProvider: React.FC<IGeneralProviderProps> = (props) => {
  const { children, router, prefetchedUser } = props

  const { user, init, cleanUp } = useAppStore((state) => ({
    user: state.user,
    init: state.init,
    cleanUp: state.cleanUp,
  }))

  const value = useMemo(
    () => ({
      router,
      user: prefetchedUser ?? user,
    }),
    [router, user, prefetchedUser],
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
