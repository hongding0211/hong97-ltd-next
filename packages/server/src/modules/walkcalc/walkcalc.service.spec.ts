import { GeneralException } from '../../exceptions/general-exceptions'
import { WalkcalcService } from './walkcalc.service'

describe('WalkcalcService', () => {
  function createService(userService: any = {}) {
    return new WalkcalcService(
      {} as any,
      { startSession: jest.fn() } as any,
      userService,
    )
  }

  function createGroup() {
    return {
      code: '0000',
      ownerUserId: 'u1',
      members: [
        { userId: 'u1', debt: 0, cost: 0 },
        { userId: 'u2', debt: 0, cost: 0 },
      ],
      tempUsers: [{ uuid: 'tmp1', name: 'Guest', debt: 0, cost: 0 }],
      records: [],
      archivedUserIds: [],
      createdAtMs: 1,
      modifiedAt: 1,
    }
  }

  it('applies and reverses record balances for formal and temporary users', () => {
    const service = createService() as any
    const group = createGroup()
    const record = {
      who: 'u1',
      paid: 300,
      forWhom: ['u1', 'u2', 'tmp1'],
      isDebtResolve: false,
    }

    service.applyRecordBalance(group, record, 1)

    expect(group.members).toEqual([
      { userId: 'u1', debt: 200, cost: 100 },
      { userId: 'u2', debt: -100, cost: 100 },
    ])
    expect(group.tempUsers[0]).toEqual({
      uuid: 'tmp1',
      name: 'Guest',
      debt: -100,
      cost: 100,
    })

    service.applyRecordBalance(group, record, -1)

    expect(group.members).toEqual([
      { userId: 'u1', debt: 0, cost: 0 },
      { userId: 'u2', debt: 0, cost: 0 },
    ])
    expect(group.tempUsers[0]).toEqual({
      uuid: 'tmp1',
      name: 'Guest',
      debt: 0,
      cost: 0,
    })
  })

  it('does not update cost for debt-resolution records', () => {
    const service = createService() as any
    const group = createGroup()

    service.applyRecordBalance(
      group,
      {
        who: 'u1',
        paid: 200,
        forWhom: ['u2'],
        isDebtResolve: true,
      },
      1,
    )

    expect(group.members[0].debt).toBe(200)
    expect(group.members[1].debt).toBe(-200)
    expect(group.members[1].cost).toBe(0)
  })

  it('rejects invalid participants before changing balances', () => {
    const service = createService() as any
    const group = createGroup()

    expect(() =>
      service.applyRecordBalance(
        group,
        {
          who: 'missing',
          paid: 200,
          forWhom: ['u2'],
        },
        1,
      ),
    ).toThrow(GeneralException)
    expect(group.members[1].debt).toBe(0)
  })

  it('returns only public user helper data from user service methods', async () => {
    const userService = {
      findPublicUsersByIds: jest.fn(async () => [
        { userId: 'u1', profile: { name: 'Hong' } },
      ]),
      searchPublicUsersByName: jest.fn(async () => [
        { userId: 'u2', profile: { name: 'Mehaa' } },
      ]),
    }
    const service = createService(userService)

    await expect(service.users(['u1'])).resolves.toEqual([
      { userId: 'u1', profile: { name: 'Hong' } },
    ])
    await expect(service.searchUsers('me')).resolves.toEqual([
      { userId: 'u2', profile: { name: 'Mehaa' } },
    ])
    await expect(service.searchUsers('')).resolves.toEqual([])
  })
})
