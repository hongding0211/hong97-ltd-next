import { appWithTranslation, useTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'
import React, { useEffect } from 'react'

import { Toaster, toast } from 'sonner'
import { GeneralProvider } from '../components/hoc/general-context/GeneralProvider'
import '../styles/globals.css'
import { emitter } from '../utils/emitter'

function App(props: AppProps) {
  const { Component, pageProps, router } = props

  const { t } = useTranslation('common')

  useEffect(() => {
    localStorage.removeItem('darkMode')
  }, [])

  /** A toast event listener */
  useEffect(() => {
    emitter.on('toast', (args) => {
      if (!args) {
        return
      }
      let toastFn: any = toast
      if (args.type === 'error') {
        toastFn = toast.error
      }
      if (args.type === 'success') {
        toastFn = toast.success
      }
      toastFn(t(args.msg))
    })
    return () => {
      emitter.off('toast')
    }
  }, [t])

  return (
    <GeneralProvider router={router}>
      <Component {...pageProps} />
      <Toaster />
    </GeneralProvider>
  )
}

const AppWithTranslation: React.ComponentType<AppProps> =
  appWithTranslation(App)
export default AppWithTranslation
