import { create } from 'zustand'
import { requester } from '../../services/requester'

export type LoginStoreState = {
  account: string
  password: string
  registerAccount: string
  registerPassword: string
  msg: string
  tab: 'login' | 'signup'
  loading: boolean
  redirect: string
  showRedirecting: boolean
}

export type LoginStoreAction = {
  setAccount: (account: string) => void
  setPassword: (password: string) => void
  login: () => void
  signUp: () => void
  cleanUp: () => void
  changeTab: (tab: 'login' | 'signup') => void
  init: (payload?: { redirect?: string }) => void
}

const initialState: LoginStoreState = {
  msg: '',
  account: '',
  password: '',
  registerAccount: '',
  registerPassword: '',
  tab: 'login',
  loading: false,
  redirect: '',
  showRedirecting: false,
}

export const useLoginStore = create<LoginStoreState & LoginStoreAction>(
  (set, get) => {
    const validate = () => {
      const { account, password } = get()

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
      return {
        phone,
        email,
        password,
      }
    }

    return {
      ...initialState,
      setAccount: (account: string) => set({ account }),
      setPassword: (password: string) => set({ password }),
      login: () => {},
      init: (payload) => {
        const { redirect } = payload || {}
        set(() => ({
          redirect,
        }))
        requester.get('GetInfo')
      },
      cleanUp: () => set(initialState),
      changeTab: (tab: 'login' | 'signup') =>
        set({
          tab,
          password: '',
          msg: undefined,
        }),
      signUp: () => {
        const res = validate()
        if (!res) {
          return
        }
        // const { phone, email, password } = res
      },
    }
  },
)
