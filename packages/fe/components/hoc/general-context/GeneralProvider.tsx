import { useAppStore } from '@stores/general'
import { NextRouter } from 'next/router'
import React, { useCallback, useEffect, useMemo } from 'react'
import useDarkMode from 'use-dark-mode'
import { GeneralContext } from './GeneralContext'

interface IGeneralProviderProps {
  children: React.ReactNode
  router: NextRouter
}

export const GeneralProvider: React.FC<IGeneralProviderProps> = (props) => {
  const { children, router } = props

  const { init, cleanUp } = useAppStore((state) => ({
    init: state.init,
    cleanUp: state.cleanUp,
  }))

  const darkMode = useDarkMode(false, {
    onChange: (val) => {
      if (val) {
        document.documentElement.className = 'dark'
      } else {
        document.documentElement.className = 'light'
      }
    },
  })

  const setDarkModeEnabled = useCallback(
    (value: boolean) => {
      if (value) {
        darkMode.enable()
      } else {
        darkMode.disable()
      }
    },
    [darkMode],
  )

  const value = useMemo(
    () => ({
      darkModeEnabled: darkMode.value,
      setDarkModeEnabled,
      router,
    }),
    [darkMode, setDarkModeEnabled, router],
  )

  useEffect(() => {
    init()
    return cleanUp
  }, [init, cleanUp])

  return (
    <GeneralContext.Provider value={value}>{children}</GeneralContext.Provider>
  )
}
