'use client'
import { http } from '@services/http'
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
  login: () => void
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

    return {
      ...initialState,
      setAccount: (account: string) => set({ account }),
      setPassword: (password: string) => set({ password }),
      setName: (name: string) => set({ name }),
      login: async () => {
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
            if (redirect) {
              /** If a redirect url is provided, redirect to it */
              window.location.href = redirect
            } else {
              /** Otherwise, append the token to the current url */
              const url = new URL(window.location.href)
              window.location.href = `${url}#${loginRes.data.token}`
              set({
                showRedirecting: true,
                avatar: loginRes.data.user.profile.avatar ?? '',
                name: loginRes.data.user.profile.name ?? '',
              })
            }
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
