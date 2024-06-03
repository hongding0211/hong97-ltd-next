import { AUTH_PATHS } from './auth/urls'
import { APIs } from './types'

export const BASE_URL = 'http://localhost:3000/'

export const PATHS: Record<keyof APIs, string> = {
  ...AUTH_PATHS,
}
