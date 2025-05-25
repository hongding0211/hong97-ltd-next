import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import micromatch from 'micromatch'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const path = request.path

    // 检查是否在忽略列表中
    const ignorePaths = this.configService.get<string[]>('auth.ignore') || []
    if (this.matchPathWithGlob(path, ignorePaths)) {
      return true
    }

    const softIgnorePaths =
      this.configService.get<string[]>('auth.softIgnore') ?? []
    const isSoftIgnore = this.matchPathWithGlob(path, softIgnorePaths)

    const token = this.extractTokenFromHeader(request)

    if (!token && !isSoftIgnore) {
      throw new UnauthorizedException('No token provided')
    }

    try {
      if (token) {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('auth.jwt.secret'),
        })
        request.user = {
          id: payload.sub,
        }
      }
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }

  private matchPathWithGlob(path: string, patterns: string[]): boolean {
    return micromatch.isMatch(path, patterns)
  }
}
