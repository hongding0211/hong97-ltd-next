import { appWithTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'
import React, { useEffect } from 'react'

import '../styles/globals.css'
import { GeneralProvider } from '../components/hoc/general-context/GeneralProvider'

function App(props: AppProps) {
  const { Component, pageProps, router } = props

  useEffect(() => {
    localStorage.removeItem('darkMode')
  }, [])

  return (
    <GeneralProvider router={router}>
      <Component {...pageProps} />
    </GeneralProvider>
  )
}

export default appWithTranslation(App)
