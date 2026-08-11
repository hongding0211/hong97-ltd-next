import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common'
import {
  REQUIRED_PERMISSIONS_METADATA,
  RequiredPermissions,
} from '../modules/permissions/permission.constants'
import { PermissionGuard } from '../modules/permissions/permission.guard'

function permissionDecorator(requirement: RequiredPermissions) {
  return applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS_METADATA, requirement),
    UseGuards(PermissionGuard),
  )
}

/** Requires any one of the listed permission points. */
export function RequirePermissions(...keys: string[]) {
  return permissionDecorator({ keys, match: 'any' })
}

/** Reserved for routes that require every listed permission point. */
export function RequireAllPermissions(...keys: string[]) {
  return permissionDecorator({ keys, match: 'all' })
}
