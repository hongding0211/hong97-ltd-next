import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RootOnlyGuard } from './root-only.decorator'

function createContext(userId?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: userId ? { id: userId } : undefined,
      }),
    }),
  } as ExecutionContext
}

describe('RootOnlyGuard', () => {
  const guard = new RootOnlyGuard({
    get: jest.fn((key: string) =>
      key === 'auth.rootUsers' ? ['root-user-id'] : undefined,
    ),
  } as unknown as ConfigService)

  it('rejects unauthenticated requests with 401', () => {
    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    )
  })

  it('rejects non-root authenticated requests with 403', () => {
    expect(() => guard.canActivate(createContext('regular-user-id'))).toThrow(
      ForbiddenException,
    )
  })

  it('allows root users', () => {
    expect(guard.canActivate(createContext('root-user-id'))).toBe(true)
  })
})
