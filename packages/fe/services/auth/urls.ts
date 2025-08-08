import { AuthAPIS } from './types'

export const AUTH_PATHS: Record<keyof AuthAPIS, string> = {
  PostLogin: 'auth/login',
  PostRegister: 'auth/register',
  GetInfo: 'auth/info',
  PatchProfile: 'auth/profile',
  PostModifyPassword: 'auth/modifyPassword',
  GetRefreshToken: 'auth/refreshToken',
  GetHasLocalAuth: 'auth/hasLocalAuth',
  GetIsAdmin: 'auth/isAdmin',
}
