import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import {
  REQUIRED_PERMISSIONS_METADATA,
  RequiredPermissions,
} from './permission.constants'
import { PermissionsService } from './permissions.service'

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<RequiredPermissions>(
      REQUIRED_PERMISSIONS_METADATA,
      [context.getHandler(), context.getClass()],
    )
    if (!requirement?.keys.length) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const userId = request?.user?.id
    if (!userId) {
      throw new UnauthorizedException('No token provided')
    }
    await this.permissionsService.assertUserHasPermissions(
      userId,
      requirement.keys,
      requirement.match,
    )
    return true
  }
}
