import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { http } from '@services/http'
import { create } from 'zustand'

interface AppStore {
  user: UserResponseDto | null
  isLoading: boolean
}

interface AppStoreAction {
  init: (initialUser?: UserResponseDto | null) => Promise<void>
  cleanUp: () => void
  refresh: () => void
  logout: (locale: string) => void
}

const initialState: AppStore = {
  user: null,
  isLoading: true,
}

export const useAppStore = create<AppStore & AppStoreAction>((set) => {
  return {
    ...initialState,
    init: async (initialUser?: UserResponseDto | null) => {
      try {
        set({ isLoading: true })

        // If user is already provided from SSR, skip getInfo request
        if (initialUser) {
          set({ user: initialUser })
        } else {
          try {
            const response = await http.get('GetInfo', undefined, {
              ignoreUnauthorized: true,
            })
            if (response.isSuccess) {
              set({ user: response.data })
              return
            }
          } catch {
            // Try to restore the session with the refresh cookie below.
          }

          await http.post('PostRefreshToken', undefined, undefined, {
            ignoreUnauthorized: true,
          })
          const response = await http.get('GetInfo', undefined, {
            ignoreUnauthorized: true,
          })
          if (response.isSuccess) {
            set({ user: response.data })
          }
        }
      } catch {
        // noop
      } finally {
        set({ isLoading: false })
      }
    },
    cleanUp: () => {
      set({ ...initialState })
    },
    refresh: async () => {
      try {
        set({ isLoading: true })
        const response = await http.get('GetInfo')
        if (response.isSuccess) {
          set({ user: response.data })
        }
      } finally {
        set({ isLoading: false })
      }
    },
    logout: async (locale: string) => {
      set({ isLoading: true })
      await http.post('PostLogout')
      window.location.href = `/${locale}/about`
      set({ ...initialState })
    },
  }
})
