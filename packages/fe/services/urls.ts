import { AUTH_PATHS } from './auth/urls'
import { BLOG_PATHS } from './blog/urls'
import { OSS_PATHS } from './oss/urls'
import { SHORTLINK_PATHS } from './shortlink/urls'
import { TRASH_PATHS } from './trash/urls'
import { APIs } from './types'
import { UCP_PATHS } from './ucp/urls'

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? ''

export const PATHS: Record<keyof APIs, string> = {
  ...AUTH_PATHS,
  ...OSS_PATHS,
  ...BLOG_PATHS,
  ...UCP_PATHS,
  ...TRASH_PATHS,
  ...SHORTLINK_PATHS,
}
