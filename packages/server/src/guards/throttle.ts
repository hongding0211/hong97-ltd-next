import { ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    return (
      request?.path === '/oss/requestUpload' && request?.user?.isRoot === true
    )
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req?.user?.id) {
      return req?.user?.id
    }
    return this.getRequestIp(req)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return super.canActivate(context)
  }

  private getRequestIp(req: Record<string, any>) {
    const headers = req?.headers ?? {}
    const realIp = headers['x-real-ip'] || headers['X-Real-IP']
    if (typeof realIp === 'string' && realIp.trim()) {
      return realIp.trim()
    }

    const forwardedFor =
      headers['x-forwarded-for'] || headers['X-Forwarded-For']
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0].trim()
    }

    return req.ips?.[0] || req.ip || ''
  }
}
