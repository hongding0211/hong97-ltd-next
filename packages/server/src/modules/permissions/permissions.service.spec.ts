import { ForbiddenException } from '@nestjs/common'
import { PermissionsService } from './permissions.service'

describe('PermissionsService', () => {
  let grantedKeys: string[]
  let service: PermissionsService

  beforeEach(() => {
    grantedKeys = []
    service = new PermissionsService(
      {
        distinct: jest.fn(async () => grantedKeys),
      } as any,
      {} as any,
      {
        get: jest.fn((key: string) => {
          if (key === 'permissions.keys') {
            return ['alpha', 'beta']
          }
          if (key === 'auth.rootUsers') {
            return ['root-user']
          }
          return undefined
        }),
      } as any,
    )
  })

  it('allows a root user without stored grants', async () => {
    await expect(
      service.assertUserHasPermissions('root-user', ['alpha']),
    ).resolves.toBeUndefined()
  })

  it('uses any matching permission by default', async () => {
    grantedKeys = ['beta']
    await expect(
      service.assertUserHasPermissions('user-1', ['alpha', 'beta']),
    ).resolves.toBeUndefined()
  })

  it('can require all listed permission points', async () => {
    grantedKeys = ['beta']
    await expect(
      service.assertUserHasPermissions('user-1', ['alpha', 'beta'], 'all'),
    ).rejects.toBeInstanceOf(ForbiddenException)

    grantedKeys = ['alpha', 'beta']
    await expect(
      service.assertUserHasPermissions('user-1', ['alpha', 'beta'], 'all'),
    ).resolves.toBeUndefined()
  })

  it('fails closed for a permission point missing from runtime config', async () => {
    await expect(
      service.assertUserHasPermissions('root-user', ['unknown']),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rejects a user without a matching grant', async () => {
    await expect(
      service.assertUserHasPermissions('user-1', ['alpha']),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})
