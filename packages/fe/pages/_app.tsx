import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { appWithTranslation, useTranslation } from 'next-i18next'
import type { AppContext, AppProps } from 'next/app'
import React, { useEffect } from 'react'

import { http } from '@services/http'
import { useTheme } from 'next-themes'
import NProgress from 'nprogress'
import { Toaster } from 'sonner'
import { GeneralProvider } from '../components/hoc/general-context/GeneralProvider'
import '../styles/code.css'
import '../styles/globals.css'
import '../styles/nprogress.css'
import '../styles/tiptap.css'
import { registerToast } from '../utils/toast'

interface CustomAppProps extends AppProps {
  user?: UserResponseDto | null
}

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

function App(props: CustomAppProps) {
  const { router, user } = props

  const { t } = useTranslation('toast')

  /** Configure NProgress */
  useEffect(() => {
    NProgress.configure({ showSpinner: false })
  }, [])

  /** Router events for loading bar */
  useEffect(() => {
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    const handleStartFn = (e: string) => {
      if (e.match(/\/about/)?.length || ['/', '/cn', '/en'].includes(e)) {
        return
      }
      handleStart()
    }

    router.events.on('routeChangeStart', handleStartFn)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    return () => {
      router.events.off('routeChangeStart', handleStartFn)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router])

  /** A toast event listener */
  useEffect(() => {
    const unregister = registerToast(t)
    return unregister
  }, [t])

  return (
    <GeneralProvider router={router} prefetchedUser={user}>
      <Child {...props} />
    </GeneralProvider>
  )
}

App.getInitialProps = async (appContext: AppContext) => {
  const { ctx } = appContext

  try {
    const userData = await http.get('GetInfo', undefined, {
      // @ts-ignore
      serverSideCtx: ctx,
      enableOnlyWithAuthInServerSide: true,
    })

    return { user: userData?.data || null }
  } catch {
    return { user: null }
  }
}

const AppWithTranslation: React.ComponentType<AppProps> =
  appWithTranslation(App)
export default AppWithTranslation
