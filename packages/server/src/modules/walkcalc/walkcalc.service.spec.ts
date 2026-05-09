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
        { userId: 'u1', debtMinor: '0', costMinor: '0' },
        { userId: 'u2', debtMinor: '0', costMinor: '0' },
      ],
      tempUsers: [
        { uuid: 'tmp1', name: 'Guest', debtMinor: '0', costMinor: '0' },
      ],
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
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      isDebtResolve: false,
    }

    service.applyRecordBalance(group, record, 1)

    expect(group.members).toEqual([
      { userId: 'u1', debtMinor: '200', costMinor: '100' },
      { userId: 'u2', debtMinor: '-100', costMinor: '100' },
    ])
    expect(group.tempUsers[0]).toEqual({
      uuid: 'tmp1',
      name: 'Guest',
      debtMinor: '-100',
      costMinor: '100',
    })

    service.applyRecordBalance(group, record, -1)

    expect(group.members).toEqual([
      { userId: 'u1', debtMinor: '0', costMinor: '0' },
      { userId: 'u2', debtMinor: '0', costMinor: '0' },
    ])
    expect(group.tempUsers[0]).toEqual({
      uuid: 'tmp1',
      name: 'Guest',
      debtMinor: '0',
      costMinor: '0',
    })
  })

  it('splits uneven records in whole cents without residual debt', () => {
    const service = createService() as any
    const group = createGroup()

    service.applyRecordBalance(
      group,
      {
        who: 'u1',
        paidMinor: '100',
        forWhom: ['u1', 'u2', 'tmp1'],
        isDebtResolve: false,
      },
      1,
    )

    expect(group.members).toEqual([
      { userId: 'u1', debtMinor: '66', costMinor: '34' },
      { userId: 'u2', debtMinor: '-33', costMinor: '33' },
    ])
    expect(group.tempUsers[0]).toEqual({
      uuid: 'tmp1',
      name: 'Guest',
      debtMinor: '-33',
      costMinor: '33',
    })
  })

  it('does not update cost for debt-resolution records', () => {
    const service = createService() as any
    const group = createGroup()

    service.applyRecordBalance(
      group,
      {
        who: 'u1',
        paidMinor: '200',
        forWhom: ['u2'],
        isDebtResolve: true,
      },
      1,
    )

    expect(group.members[0].debtMinor).toBe('200')
    expect(group.members[1].debtMinor).toBe('-200')
    expect(group.members[1].costMinor).toBe('0')
  })

  it('rejects invalid participants before changing balances', () => {
    const service = createService() as any
    const group = createGroup()

    expect(() =>
      service.applyRecordBalance(
        group,
        {
          who: 'missing',
          paidMinor: '200',
          forWhom: ['u2'],
        },
        1,
      ),
    ).toThrow(GeneralException)
    expect(group.members[1].debtMinor).toBe('0')
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
    group.members[0].debtMinor = '-120'
    group.members[1].debtMinor = '80'
    group.tempUsers[0].debtMinor = '40'
    const service = createResolveService(group)

    const records = await service.resolveDebts('u1', {
      groupCode: '0000',
      transfers: [
        { from: 'u1', to: 'u2', amountMinor: '80' },
        { from: 'u1', to: 'tmp1', amountMinor: '40' },
      ],
    })

    expect(records).toHaveLength(2)
    expect(records).toEqual([
      expect.objectContaining({
        who: 'u1',
        paid: 80,
        paidMinor: '80',
        forWhom: ['u2'],
        type: 'debtResolve',
        isDebtResolve: true,
      }),
      expect.objectContaining({
        who: 'u1',
        paid: 40,
        paidMinor: '40',
        forWhom: ['tmp1'],
        type: 'debtResolve',
        isDebtResolve: true,
      }),
    ])
    expect(group.records).toHaveLength(2)
    expect(group.members[0].debtMinor).toBe('0')
    expect(group.members[1].debtMinor).toBe('0')
    expect(group.tempUsers[0].debtMinor).toBe('0')
    expect(group.members[1].costMinor).toBe('0')
    expect(group.tempUsers[0].costMinor).toBe('0')
    expect(group.save).toHaveBeenCalledTimes(1)
  })

  it('applies large exact values beyond Number.MAX_SAFE_INTEGER', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)

    const record = await service.addRecord('u1', {
      groupCode: '0000',
      who: 'u1',
      paidMinor: '9007199254740993',
      forWhom: ['u2'],
      type: 'food',
      text: '',
      long: '',
      lat: '',
    })

    expect(record.paidMinor).toBe('9007199254740993')
    expect(group.members[0].debtMinor).toBe('9007199254740993')
    expect(group.members[1].debtMinor).toBe('-9007199254740993')
    expect(group.members[1].costMinor).toBe('9007199254740993')
  })

  it('does not partially mutate a bulk debt resolution with an invalid transfer', async () => {
    const group = createPersistedGroup()
    group.members[0].debtMinor = '-120'
    group.members[1].debtMinor = '80'
    group.tempUsers[0].debtMinor = '40'
    const service = createResolveService(group)

    await expect(
      service.resolveDebts('u1', {
        groupCode: '0000',
        transfers: [
          { from: 'u1', to: 'u2', amountMinor: '80' },
          { from: 'u1', to: 'missing', amountMinor: '40' },
        ],
      }),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(group.records).toHaveLength(0)
    expect(group.members[0].debtMinor).toBe('-120')
    expect(group.members[1].debtMinor).toBe('80')
    expect(group.tempUsers[0].debtMinor).toBe('40')
    expect(group.save).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: 'empty transfer list',
      transfers: [],
    },
    {
      name: 'zero amount',
      transfers: [{ from: 'u1', to: 'u2', amountMinor: '0' }],
    },
    {
      name: 'negative amount',
      transfers: [{ from: 'u1', to: 'u2', amountMinor: '-10' }],
    },
    {
      name: 'sub-cent amount',
      transfers: [{ from: 'u1', to: 'u2', amount: 0.0001 }],
    },
    {
      name: 'invalid payer',
      transfers: [{ from: 'missing', to: 'u2', amountMinor: '10' }],
    },
    {
      name: 'invalid receiver',
      transfers: [{ from: 'u1', to: 'missing', amountMinor: '10' }],
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
          { from: 'u1', to: 'u2', amountMinor: '10' },
          { from: 'u1', to: 'tmp1', amountMinor: '10' },
        ],
      }),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(group.records).toHaveLength(4999)
    expect(group.save).not.toHaveBeenCalled()
  })
})
