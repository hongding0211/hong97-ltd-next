import { AUTH_PATHS } from './auth/urls'
import { OSS_PATHS } from './oss/urls'
import { APIs } from './types'

export const BASE_URL = process.env.BASE_URL ?? ''

export const PATHS: Record<keyof APIs, string> = {
  ...AUTH_PATHS,
  ...OSS_PATHS,
}
