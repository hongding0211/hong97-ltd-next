import { PermissionAPIS } from './types'

export const PERMISSION_PATHS: Record<keyof PermissionAPIS, string> = {
  GetPermissions: '/permissions',
  GetPermissionUsers: '/permissions/:permissionKey/users',
  PostPermissionGrant: '/permissions/:permissionKey/grants',
  DeletePermissionGrant: '/permissions/:permissionKey/grants/:userId',
}
