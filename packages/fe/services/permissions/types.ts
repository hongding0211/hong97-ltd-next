import {
  CreatePermissionGrantDto,
  PermissionManagementResponseDto,
} from '@server/modules/permissions/dto/permission.dto'
import { API } from '../types'

export type PermissionAPIS = {
  GetPermissions: API<
    undefined,
    undefined,
    typeof PermissionManagementResponseDto
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
