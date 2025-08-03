import { ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req?.headers?.['X-Real-IP'] || req.ips?.[0] || req.ip || ''
    if (req?.user?.id) {
      return req?.user?.id
    }
    return ip
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return super.canActivate(context)
  }
}
