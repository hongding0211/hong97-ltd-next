'use client'
import { http } from '@services/http'
import type { PasskeyLogin } from '@services/sso/passkeys'
import { toast } from '@utils/toast'
import { create } from 'zustand'

export type LoginStoreState = {
  account: string
  password: string
  name: string
  registerAccount: string
  registerPassword: string
  msg: string
  tab: 'login' | 'signup'
  loading: boolean
  redirect: string
  showRedirecting: boolean
  avatar: string
}

export type LoginStoreAction = {
  setAccount: (account: string) => void
  setPassword: (password: string) => void
  setName: (name: string) => void
  setAvatar: (avatar: string) => void
  login: (
    offerPasskey?: (
      continueLogin: (fallbackRedirect?: string) => void,
    ) => Promise<boolean>,
  ) => Promise<void>
  completeLogin: (session: PasskeyLogin) => void
  signUp: () => void
  changeTab: (tab: 'login' | 'signup') => void
  init: (props: { redirect: string }) => void
  cleanUp: () => void
}

const initialState: LoginStoreState = {
  msg: '',
  account: '',
  name: '',
  password: '',
  registerAccount: '',
  registerPassword: '',
  tab: 'login',
  loading: false,
  redirect: '',
  showRedirecting: false,
  avatar: '',
}

const accessTokenRedirectProtocols = (
  process.env.NEXT_PUBLIC_AUTH_ALLOWED_REDIRECT_SCHEMES ?? ''
)
  .split(',')
  .map((scheme) => scheme.trim())
  .filter(Boolean)
  .map((scheme) => (scheme.endsWith(':') ? scheme : `${scheme}:`))

const shouldPassTokenToRedirect = (redirect: string) => {
  try {
    const url = new URL(redirect)
    const isInternalCallback =
      url.origin === window.location.origin && url.pathname === '/auth/callback'

    return (
      accessTokenRedirectProtocols.includes(url.protocol) || isInternalCallback
    )
  } catch {
    return false
  }
}

const withAuthTokenHash = (
  redirect: string,
  tokens: { accessToken: string; refreshToken?: string },
) => {
  const url = new URL(redirect)
  url.hash = new URLSearchParams(
    Object.entries(tokens).filter(([, value]) => Boolean(value)) as [
      string,
      string,
    ][],
  ).toString()
  return url.toString()
}

export const useLoginStore = create<LoginStoreState & LoginStoreAction>(
  (set, get) => {
    const validate = (isRegister: boolean) => {
      const { account, password, name } = get()

      const phone = /^\d{11}$/.test(account) ? account : undefined
      const email = /^\S+@\S+.\w$/.test(account) ? account : undefined

      if (!phone && !email) {
        set(() => ({
          msg: 'invalidPhoneOrEmail',
        }))
        return false
      }
      if (!password) {
        set(() => ({
          msg: 'emptyPassword',
        }))
        return false
      }
      if (isRegister && !name) {
        set(() => ({
          msg: 'emptyName',
        }))
        return false
      }
      return {
        phone: phone?.trim(),
        email: email?.trim(),
        password: password.trim(),
        name: name.trim(),
      }
    }

    const completeLogin = (
      session: PasskeyLogin,
      redirect = get().redirect,
    ) => {
      if (session.destination) {
        window.location.href = session.destination
      } else if (redirect) {
        window.location.href = shouldPassTokenToRedirect(redirect)
          ? withAuthTokenHash(redirect, {
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
            })
          : redirect
      } else {
        const url = new URL(window.location.href)
        url.hash = session.accessToken
        window.location.href = url.href
        set({
          showRedirecting: true,
          avatar: session.user.profile.avatar ?? '',
          name: session.user.profile.name ?? '',
        })
      }
    }

    return {
      ...initialState,
      completeLogin,
      setAccount: (account: string) => set({ account }),
      setPassword: (password: string) => set({ password }),
      setName: (name: string) => set({ name }),
      login: async (offerPasskey) => {
        if (get().loading) return
        set({
          msg: '',
        })
        const res = validate(false)
        if (!res) {
          return
        }
        const { phone, email, password } = res
        try {
          set({
            loading: true,
          })
          const loginRes = await http.post('PostLogin', {
            type: 'local',
            credentials: {
              phoneNumber: phone,
              email,
              password,
            },
          })
          if (loginRes.isSuccess) {
            const { redirect } = get()
            const finish = (fallbackRedirect?: string) =>
              completeLogin(loginRes.data, redirect || fallbackRedirect)
            const invited = await offerPasskey?.(finish)
            if (!invited) finish()
          } else {
            toast(loginRes.msg, {
              type: 'error',
            })
          }
        } finally {
          set({
            loading: false,
          })
        }
      },
      changeTab: (tab: 'login' | 'signup') =>
        set({
          tab,
          password: '',
          msg: undefined,
        }),
      signUp: async () => {
        set({
          msg: '',
        })
        const res = validate(true)
        if (!res) {
          return
        }
        try {
          set({
            loading: true,
          })
          const { phone, email, password, name } = res

          const { avatar } = get()

          const loginRes = await http.post('PostRegister', {
            type: 'local',
            credentials: {
              phoneNumber: phone,
              email,
              password,
              profile: {
                name,
                avatar: avatar || undefined,
              },
            },
          })

          if (loginRes.isSuccess) {
            toast('registerSuccess', {
              type: 'success',
            })
            set({
              tab: 'login',
              password: '',
              avatar: '',
            })
          } else {
            toast(loginRes.msg, {
              type: 'error',
            })
          }
        } finally {
          set({
            loading: false,
          })
        }
      },
      setAvatar: (avatar: string) => set({ avatar }),
      init: (props: { redirect: string }) => {
        set({
          redirect: props.redirect,
        })
      },
      cleanUp: () => {
        set({
          ...initialState,
        })
      },
    }
  },
)
