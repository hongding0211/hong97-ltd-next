import { ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req?.user?.id) {
      return req?.user?.id
    }
    return req.ips.length ? req.ips[0] : req.ip
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return super.canActivate(context)
  }
}
