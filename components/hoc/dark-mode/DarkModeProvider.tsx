import React, { useEffect, useMemo, useState } from 'react'
import { DarkModeContext } from './DarkModeContext'
import useDarkMode from 'use-dark-mode'

interface IDarkModeProviderProps {
  children: React.ReactNode
}

export const DarkModeProvider: React.FC<IDarkModeProviderProps> = (props) => {
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
      currentValue: darkModeEnabled,
      setValue: setDarkModeEnabled,
    }),
    [],
  )

  useEffect(() => {
    if (darkModeEnabled) {
      darkMode.enable()
    } else {
      darkMode.disable()
    }
  }, [darkModeEnabled])

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  )
}
