import { appWithTranslation, useTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'
import React, { useEffect } from 'react'

import { Toaster } from 'sonner'
import useDarkMode from 'use-dark-mode'
import { GeneralProvider } from '../components/hoc/general-context/GeneralProvider'
import { http } from '../services/http'
import '../styles/globals.css'
import { registerToast } from '../utils/toast'

function App(props: AppProps) {
  const { Component, pageProps, router } = props

  const { t, i18n } = useTranslation('toast')

  const darkMode = useDarkMode()

  useEffect(() => {
    localStorage.removeItem('darkMode')
  }, [])

  http.setLocale(i18n.language)

  /** A toast event listener */
  useEffect(() => {
    const unregister = registerToast(t)
    return unregister
  }, [t])

  return (
    <GeneralProvider router={router}>
      <Component {...pageProps} />
      <Toaster
        theme={darkMode.value ? 'dark' : 'light'}
        position="top-center"
      />
    </GeneralProvider>
  )
}

const AppWithTranslation: React.ComponentType<AppProps> =
  appWithTranslation(App)
export default AppWithTranslation
