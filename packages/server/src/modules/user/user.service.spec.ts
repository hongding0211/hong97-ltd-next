import { UserService } from './user.service'

describe('UserService', () => {
  it('searches UID and name with an escaped fuzzy query and paginates', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest
        .fn()
        .mockResolvedValue([{ userId: 'alice-1', profile: { name: 'Alice' } }]),
    }
    const userModel = {
      find: jest.fn(() => query),
      countDocuments: jest.fn().mockResolvedValue(41),
    }
    const service = new UserService(userModel as any)

    await expect(service.searchPublicUsers('alice.+', 2, 20)).resolves.toEqual({
      users: [{ userId: 'alice-1', profile: { name: 'Alice' } }],
      total: 41,
    })
    expect(userModel.find).toHaveBeenCalledWith({
      $or: [
        { userId: { $regex: 'alice\\.\\+', $options: 'i' } },
        { 'profile.name': { $regex: 'alice\\.\\+', $options: 'i' } },
      ],
    })
    expect(query.skip).toHaveBeenCalledWith(20)
    expect(query.limit).toHaveBeenCalledWith(20)
  })

  it('can limit search to granted users', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    }
    const userModel = {
      find: jest.fn(() => query),
      countDocuments: jest.fn().mockResolvedValue(0),
    }
    const service = new UserService(userModel as any)

    await service.searchPublicUsers('ali', 1, 20, {
      includeUserIds: ['user-1'],
    })

    expect(userModel.find).toHaveBeenCalledWith({
      $and: [
        {
          $or: [
            { userId: { $regex: 'ali', $options: 'i' } },
            { 'profile.name': { $regex: 'ali', $options: 'i' } },
          ],
        },
        { userId: { $in: ['user-1'] } },
      ],
    })
  })
})
