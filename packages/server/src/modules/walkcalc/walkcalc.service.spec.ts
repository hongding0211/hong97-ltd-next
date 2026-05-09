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

  function createGroup(): any {
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

  function createPersistedGroup() {
    return {
      ...createGroup(),
      save: jest.fn(async function save(this: any) {
        return this
      }),
    }
  }

  function createResolveService(group: any) {
    const service = createService() as any
    service.loadGroupForMember = jest.fn(async () => group)
    service.runInOptionalTransaction = jest.fn(async (operation: any) =>
      operation(undefined),
    )
    return service
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

  it('bulk resolves multiple debts across formal and temporary users', async () => {
    const group = createPersistedGroup()
    group.members[0].debt = -120
    group.members[1].debt = 80
    group.tempUsers[0].debt = 40
    const service = createResolveService(group)

    const records = await service.resolveDebts('u1', {
      groupCode: '0000',
      transfers: [
        { from: 'u1', to: 'u2', amount: 80 },
        { from: 'u1', to: 'tmp1', amount: 40 },
      ],
    })

    expect(records).toHaveLength(2)
    expect(records).toEqual([
      expect.objectContaining({
        who: 'u1',
        paid: 80,
        forWhom: ['u2'],
        type: 'debtResolve',
        isDebtResolve: true,
      }),
      expect.objectContaining({
        who: 'u1',
        paid: 40,
        forWhom: ['tmp1'],
        type: 'debtResolve',
        isDebtResolve: true,
      }),
    ])
    expect(group.records).toHaveLength(2)
    expect(group.members[0].debt).toBe(0)
    expect(group.members[1].debt).toBe(0)
    expect(group.tempUsers[0].debt).toBe(0)
    expect(group.members[1].cost).toBe(0)
    expect(group.tempUsers[0].cost).toBe(0)
    expect(group.save).toHaveBeenCalledTimes(1)
  })

  it('does not partially mutate a bulk debt resolution with an invalid transfer', async () => {
    const group = createPersistedGroup()
    group.members[0].debt = -120
    group.members[1].debt = 80
    group.tempUsers[0].debt = 40
    const service = createResolveService(group)

    await expect(
      service.resolveDebts('u1', {
        groupCode: '0000',
        transfers: [
          { from: 'u1', to: 'u2', amount: 80 },
          { from: 'u1', to: 'missing', amount: 40 },
        ],
      }),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(group.records).toHaveLength(0)
    expect(group.members[0].debt).toBe(-120)
    expect(group.members[1].debt).toBe(80)
    expect(group.tempUsers[0].debt).toBe(40)
    expect(group.save).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: 'empty transfer list',
      transfers: [],
    },
    {
      name: 'zero amount',
      transfers: [{ from: 'u1', to: 'u2', amount: 0 }],
    },
    {
      name: 'negative amount',
      transfers: [{ from: 'u1', to: 'u2', amount: -10 }],
    },
    {
      name: 'invalid payer',
      transfers: [{ from: 'missing', to: 'u2', amount: 10 }],
    },
    {
      name: 'invalid receiver',
      transfers: [{ from: 'u1', to: 'missing', amount: 10 }],
    },
  ])('rejects bulk debt resolution for $name', async ({ transfers }) => {
    const group = createPersistedGroup()
    const service = createResolveService(group)

    await expect(
      service.resolveDebts('u1', {
        groupCode: '0000',
        transfers,
      }),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(group.records).toHaveLength(0)
    expect(group.save).not.toHaveBeenCalled()
  })

  it('rejects bulk debt resolution when it would exceed the record limit', async () => {
    const group = createPersistedGroup()
    group.records = Array.from({ length: 4999 }, (_, index) => ({
      recordId: `record-${index}`,
    }))
    const service = createResolveService(group)

    await expect(
      service.resolveDebts('u1', {
        groupCode: '0000',
        transfers: [
          { from: 'u1', to: 'u2', amount: 10 },
          { from: 'u1', to: 'tmp1', amount: 10 },
        ],
      }),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(group.records).toHaveLength(4999)
    expect(group.save).not.toHaveBeenCalled()
  })
})
