import { PATHS } from './urls'

export const AUTH_REFRESH_EXCLUDED_PATHS = [
  PATHS.PostLogin,
  PATHS.PostRegister,
  PATHS.PostRefreshToken,
  PATHS.PostLogout,
] as const
