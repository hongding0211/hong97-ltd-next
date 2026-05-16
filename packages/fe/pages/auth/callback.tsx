import Head from 'next/head'
import { useEffect, useState } from 'react'

type RefreshTokenResponse = {
  isSuccess?: boolean
  data?: {
    accessToken?: string
  }
}

const getTokenFromLocation = () => {
  const hash = window.location.hash.replace(/^#/, '')
  const search = window.location.search.replace(/^\?/, '')

  return (
    getTokenFromParams(hash) ||
    getTokenFromParams(search) ||
    (hash && !hash.includes('=') ? decodeURIComponent(hash) : '')
  )
}

const getTokenFromParams = (source: string) => {
  if (!source) {
    return ''
  }

  const params = new URLSearchParams(source)
  return params.get('accessToken') || params.get('token') || ''
}

const buildRefreshUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '/api'
  return `${baseUrl.replace(/\/+$/, '')}/auth/refreshToken`
}

const notifyNative = (url: string) => {
  ;(window as any).webkit?.messageHandlers?.authCallback?.postMessage(url)
}

export default function AuthCallback() {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const existingToken = getTokenFromLocation()
    if (existingToken) {
      notifyNative(window.location.href)
      return
    }

    const refreshToken = async () => {
      try {
        const response = await fetch(buildRefreshUrl(), {
          method: 'POST',
          credentials: 'include',
        })
        const payload = (await response.json()) as RefreshTokenResponse
        const accessToken = payload.data?.accessToken

        if (!response.ok || !payload.isSuccess || !accessToken) {
          setFailed(true)
          return
        }

        const callbackUrl = new URL(window.location.href)
        callbackUrl.hash = accessToken
        const nextUrl = callbackUrl.toString()
        notifyNative(nextUrl)
        window.location.replace(nextUrl)
      } catch {
        setFailed(true)
      }
    }

    refreshToken()
  }, [])

  return (
    <>
      <Head>
        <title>Signing in</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="flex h-dvh w-svw items-center justify-center bg-black text-white">
        {failed ? 'Sign in failed' : 'Signing in...'}
      </main>
    </>
  )
}
