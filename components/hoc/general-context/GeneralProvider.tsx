import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { GeneralContext } from './GeneralContext'
import useDarkMode from 'use-dark-mode'
import { NextRouter } from 'next/router'

interface IGeneralProviderProps {
  children: React.ReactNode
  router: NextRouter
}

export const GeneralProvider: React.FC<IGeneralProviderProps> = (props) => {
  const { children, router } = props

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

  return (
    <GeneralContext.Provider value={value}>{children}</GeneralContext.Provider>
  )
}
