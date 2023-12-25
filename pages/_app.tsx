import { appWithTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'
import React, { useEffect } from 'react'

import '../styles/globals.css'

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    localStorage.removeItem('darkMode')
  }, [])
  return <Component {...pageProps} />
}

export default appWithTranslation(App)
