import { APIs } from '../types'

export const AUTH_PATHS: Record<keyof APIs, string> = {
  PostLogin: 'auth/login',
  PostRegister: 'auth/register',
  GetInfo: 'auth/info',
  PatchProfile: 'auth/profile',
  PostModifyPassword: 'auth/modifyPassword',
}
