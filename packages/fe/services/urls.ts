import { AUTH_PATHS } from './auth/urls'
import { OSS_PATHS } from './oss/urls'
import { APIs } from './types'

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ''

export const PATHS: Record<keyof APIs, string> = {
  ...AUTH_PATHS,
  ...OSS_PATHS,
}
