// decorators/user-id.decorator.ts
import { ExecutionContext, createParamDecorator } from '@nestjs/common'

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.user.id
  },
)
