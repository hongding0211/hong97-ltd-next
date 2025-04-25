import { ACCESS_TOKEN_KEY } from '@constants'
import { UserResponseDto } from '@server/modules/user/dto/user.response.dto'
import { http } from '@services/http'
import { create } from 'zustand'

interface AppStore {
  user: UserResponseDto | null
  isLoading: boolean
}

interface AppStoreAction {
  init: () => Promise<void>
  cleanUp: () => void
  refresh: () => void
  logout: () => void
}

const initialState: AppStore = {
  user: null,
  isLoading: true,
}

export const useAppStore = create<AppStore & AppStoreAction>((set) => {
  return {
    ...initialState,
    init: async () => {
      try {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (!accessToken) {
          return
        }
        set({ isLoading: true })
        const response = await http.get('GetInfo')
        if (response.isSuccess) {
          set({ user: response.data })
        }
        // refresh access token
        const refreshedToken = (await http.get('GetRefreshToken')).data.token
        if (refreshedToken) {
          localStorage.setItem(ACCESS_TOKEN_KEY, refreshedToken)
        }
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
    logout: () => {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      window.location.href = '/about'
      set({ ...initialState })
    },
  }
})
