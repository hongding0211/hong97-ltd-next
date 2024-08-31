import { create } from 'zustand'
import shajs from 'sha.js'
import Requester from '../../services/requester'
import { IPostApiLogin } from '../../services/types'
import { APIS } from '../../services/config'

const ERR_MAP = {
  '邮箱 / 电话错误': 'accountNotExist',
  密码错误: 'invalidPassword',
}

export type LoginStoreState = {
  account: string
  password: string
  registerAccount: string
  registerPassword: string
  msg: string
  tab: 'login' | 'signup'
}

export type LoginStoreAction = {
  setAccount: (account: string) => void
  setPassword: (password: string) => void
  login: () => void
  cleanUp: () => void
  changeTab: (tab: 'login' | 'signup') => void
}

const initialState: LoginStoreState = {
  msg: '',
  account: '',
  password: '',
  registerAccount: '',
  registerPassword: '',
  tab: 'login',
}

export const useLoginStore = create<LoginStoreState & LoginStoreAction>(
  (set, get) => {
    let loading = false

    return {
      ...initialState,
      setAccount: (account: string) => set({ account }),
      setPassword: (password: string) => set({ password }),
      login: () => {
        if (loading) {
          return
        }

        const { account, password } = get()

        const phone = /^\d{11}$/.test(account) ? account : undefined
        const email = /^\S+@\S+.\w$/.test(account) ? account : undefined

        if (!phone && !email) {
          set(() => ({
            msg: 'invalidPhoneOrEmail',
          }))
          return
        }
        if (!password) {
          set(() => ({
            msg: 'emptyPassword',
          }))
          return
        }

        const hashedPassword = shajs('sha256').update(password).digest('hex')

        const req = new Requester<IPostApiLogin>(APIS.POST_LOGIN)

        loading = true

        req
          .post({
            body: {
              phone,
              email,
              password: shajs('sha256')
                .update(
                  `${Math.floor(Date.now() / 60000) - 1}${hashedPassword}`,
                )
                .digest('hex'),
            },
          })
          .then((res) => {
            if (!res?.data) {
              set(() => ({
                msg: 'commonLoginFailed',
              }))
              return
            }
            set(() => ({
              msg: '',
            }))
          })
          .catch((err) => {
            set(() => ({
              // @ts-ignore
              msg: ERR_MAP?.[err] || 'commonLoginFailed',
            }))
          })
          .finally(() => {
            loading = false
          })
      },
      cleanUp: () => set(initialState),
      changeTab: (tab: 'login' | 'signup') => set({ tab }),
    }
  },
)
