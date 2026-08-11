import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { PermissionGuard } from './permission.guard'

function context(userId?: string): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { id: userId } : undefined }),
    }),
  } as unknown as ExecutionContext
}

describe('PermissionGuard', () => {
  it('passes the configured any requirement to the permission service', async () => {
    const assertUserHasPermissions = jest.fn(async () => undefined)
    const guard = new PermissionGuard(
      {
        getAllAndOverride: jest.fn(() => ({
          keys: ['alpha', 'beta'],
          match: 'any',
        })),
      } as any,
      { assertUserHasPermissions } as any,
    )

    await expect(guard.canActivate(context('user-1'))).resolves.toBe(true)
    expect(assertUserHasPermissions).toHaveBeenCalledWith(
      'user-1',
      ['alpha', 'beta'],
      'any',
    )
  })

  it('rejects an unauthenticated request', async () => {
    const guard = new PermissionGuard(
      {
        getAllAndOverride: jest.fn(() => ({
          keys: ['alpha'],
          match: 'any',
        })),
      } as any,
      {} as any,
    )

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})
