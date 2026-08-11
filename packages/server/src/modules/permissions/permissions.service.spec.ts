import { ForbiddenException } from '@nestjs/common'
import { PermissionsService } from './permissions.service'

describe('PermissionsService', () => {
  let grantedKeys: string[]
  let service: PermissionsService
  let permissionGrantModel: {
    aggregate: jest.Mock
    distinct: jest.Mock
  }
  let userService: {
    searchPublicUsers: jest.Mock
  }

  beforeEach(() => {
    grantedKeys = []
    permissionGrantModel = {
      aggregate: jest.fn().mockResolvedValue([]),
      distinct: jest.fn(async () => grantedKeys),
    }
    userService = {
      searchPublicUsers: jest.fn(),
    }
    service = new PermissionsService(
      permissionGrantModel as any,
      userService as any,
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

  it('returns one searchable page of granted users', async () => {
    userService.searchPublicUsers.mockResolvedValue({
      users: [{ userId: 'user-2', profile: { name: 'Bob' } }],
      total: 24,
    })
    permissionGrantModel.distinct.mockResolvedValueOnce(['user-2'])

    await expect(
      service.listPermissionUsers('alpha', {
        page: 2,
        pageSize: 20,
        search: 'us',
      }),
    ).resolves.toEqual({
      permissionKey: 'alpha',
      data: [{ userId: 'user-2', profile: { name: 'Bob' }, granted: true }],
      total: 24,
      page: 2,
      pageSize: 20,
    })
    expect(userService.searchPublicUsers).toHaveBeenCalledWith('us', 2, 20, {
      includeUserIds: ['user-2'],
    })
  })

  it('returns ungranted users for the add flow', async () => {
    permissionGrantModel.distinct.mockResolvedValueOnce(['user-2'])
    userService.searchPublicUsers.mockResolvedValue({
      users: [{ userId: 'user-1', profile: { name: 'Alice' } }],
      total: 1,
    })

    await expect(
      service.listPermissionUsers('alpha', {
        page: 1,
        pageSize: 20,
        search: 'ali',
        scope: 'available',
      }),
    ).resolves.toEqual({
      permissionKey: 'alpha',
      data: [{ userId: 'user-1', profile: { name: 'Alice' }, granted: false }],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    expect(userService.searchPublicUsers).toHaveBeenCalledWith('ali', 1, 20, {
      excludeUserIds: ['user-2'],
    })
  })

  it('uses an aggregate count for the permission point list', async () => {
    permissionGrantModel.aggregate.mockResolvedValue([
      { _id: 'alpha', count: 2 },
    ])

    await expect(service.listPermissionPoints()).resolves.toEqual([
      { key: 'alpha', grantCount: 2 },
      { key: 'beta', grantCount: 0 },
    ])
  })
})
