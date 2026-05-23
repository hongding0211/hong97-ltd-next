import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class RootOnlyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const userId = request?.user?.id
    const rootUsers = this.configService.get<string[]>('auth.rootUsers') || []
    if (!userId) {
      throw new UnauthorizedException('No token provided')
    }
    if (!rootUsers.includes(userId)) {
      throw new ForbiddenException('Only root users can access this resource')
    }
    return true
  }
}

export function RootOnly() {
  return applyDecorators(UseGuards(RootOnlyGuard))
}
