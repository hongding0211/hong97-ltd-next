import {
  CreatePermissionGrantDto,
  PermissionManagementResponseDto,
  PermissionUsersResponseDto,
} from '@server/modules/permissions/dto/permission.dto'
import { API } from '../types'

export type PermissionAPIS = {
  GetPermissions: API<
    undefined,
    undefined,
    typeof PermissionManagementResponseDto
  >
  GetPermissionUsers: API<
    {
      permissionKey: string
      page?: number
      pageSize?: number
      search?: string
      scope?: 'granted' | 'available'
    },
    undefined,
    typeof PermissionUsersResponseDto
  >
  PostPermissionGrant: API<
    { permissionKey: string },
    typeof CreatePermissionGrantDto,
    { permissionKey: string; userId: string }
  >
  DeletePermissionGrant: API<
    { permissionKey: string; userId: string },
    undefined,
    { permissionKey: string; userId: string }
  >
}
