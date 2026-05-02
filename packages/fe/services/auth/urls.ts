import { AuthAPIS } from './types'

export const AUTH_PATHS: Record<keyof AuthAPIS, string> = {
  PostLogin: 'auth/login',
  PostRegister: 'auth/register',
  GetInfo: 'auth/info',
  PatchProfile: 'auth/profile',
  PostModifyPassword: 'auth/modifyPassword',
  PostRefreshToken: 'auth/refreshToken',
  GetHasLocalAuth: 'auth/hasLocalAuth',
  GetIsAdmin: 'auth/isAdmin',
  PostLogout: 'auth/logout',
  GetApiTokens: 'auth/api-tokens',
  PostApiToken: 'auth/api-tokens',
  DeleteApiToken: 'auth/api-tokens/:tokenId',
}
