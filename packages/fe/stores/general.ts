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
}

const initialState: AppStore = {
  user: null,
  isLoading: false,
}

export const useAppStore = create<AppStore & AppStoreAction>((set) => ({
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
}))
