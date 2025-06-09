import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { Request, Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const response = context.switchToHttp().getResponse<Response>()
    const token = await this.extractTokenFromHeader(context)
    if (token) {
      response.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      })
    }

    return next.handle().pipe()
  }

  private async extractTokenFromHeader(context: ExecutionContext): Promise<string | undefined> {
    const request = context.switchToHttp().getRequest<Request>()
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    const _token =  type === 'Bearer' ? token : undefined
    if (!_token) {
      return undefined
    }
    try {
      await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.jwt.secret'),
      })
      return token
    } catch {
      return undefined  
    }
  }
}
