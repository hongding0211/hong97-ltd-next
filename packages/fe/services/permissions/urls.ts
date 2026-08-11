import { PermissionAPIS } from './types'

export const PERMISSION_PATHS: Record<keyof PermissionAPIS, string> = {
  GetPermissions: '/permissions',
  PostPermissionGrant: '/permissions/:permissionKey/grants',
  DeletePermissionGrant: '/permissions/:permissionKey/grants/:userId',
}
