import { appWithTranslation, useTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'
import React, { useEffect } from 'react'

import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'
import { GeneralProvider } from '../components/hoc/general-context/GeneralProvider'
import { http } from '../services/http'
import '../styles/globals.css'
import { registerToast } from '../utils/toast'

function Child(props: AppProps) {
  const { Component, pageProps } = props

  const { theme } = useTheme() as {
    theme: 'system' | 'light' | 'dark'
  }

  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-center" theme={theme} />
    </>
  )
}

function App(props: AppProps) {
  const { router } = props

  const { t, i18n } = useTranslation('toast')

  http.setLocale(i18n.language)

  /** A toast event listener */
  useEffect(() => {
    const unregister = registerToast(t)
    return unregister
  }, [t])

  return (
    <GeneralProvider router={router}>
      <Child {...props} />
    </GeneralProvider>
  )
}

const AppWithTranslation: React.ComponentType<AppProps> =
  appWithTranslation(App)
export default AppWithTranslation
