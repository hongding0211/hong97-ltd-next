import React, { useEffect, useMemo, useState } from 'react'
import { GeneralContext } from './GeneralContext'
import useDarkMode from 'use-dark-mode'

interface IGeneralProviderProps {
  children: React.ReactNode
}

export const GeneralProvider: React.FC<IGeneralProviderProps> = (props) => {
  const { children } = props

  const [darkModeEnabled, setDarkModeEnabled] = useState(false)

  const darkMode = useDarkMode(false, {
    onChange: (val) => {
      if (val) {
        document.documentElement.className = 'dark'
      } else {
        document.documentElement.className = 'light'
      }
    },
  })

  const value = useMemo(
    () => ({
      darkModeEnabled,
      setDarkModeEnabled,
    }),
    [darkModeEnabled],
  )

  useEffect(() => {
    if (darkModeEnabled) {
      darkMode.enable()
    } else {
      darkMode.disable()
    }
  }, [darkModeEnabled, darkMode])

  return (
    <GeneralContext.Provider value={value}>{children}</GeneralContext.Provider>
  )
}
