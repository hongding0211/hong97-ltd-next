import { GeneralException } from '../../exceptions/general-exceptions'
import * as groupCode from './utils/group-code'
import { WalkcalcService } from './walkcalc.service'

describe('WalkcalcService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  function createService(userService: any = {}) {
    return new WalkcalcService(
      {} as any,
      { startSession: jest.fn() } as any,
      userService,
    )
  }

  function createServiceWithModel(model: any, userService: any = {}) {
    return new WalkcalcService(model, { startSession: jest.fn() } as any, {
      findUserById: jest.fn(async (userId: string) => ({
        userId,
        profile: { name: userId },
      })),
      findPublicUsersByIds: jest.fn(async (userIds: string[]) =>
        userIds.map((userId) => ({ userId, profile: { name: userId } })),
      ),
      searchPublicUsersByName: jest.fn(async () => []),
      ...userService,
    })
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
      markModified: jest.fn(),
    }
  }

  function seedRecord(service: any, group: any, record: any) {
    service.applyRecordBalance(group, record, 1)
    group.records.push(record)
  }

  function member(group: any, userId: string) {
    return group.members.find((item: any) => item.userId === userId)
  }

  function tempUser(group: any, uuid: string) {
    return group.tempUsers.find((item: any) => item.uuid === uuid)
  }

  function dtoMember(groupDto: any, userId: string) {
    return groupDto.members.find((item: any) => item.userId === userId)
  }

  function dtoTempUser(groupDto: any, uuid: string) {
    return groupDto.tempUsers.find((item: any) => item.uuid === uuid)
  }

  function totalDebtMinor(group: any) {
    return [...group.members, ...group.tempUsers].reduce(
      (sum, participant) => sum + BigInt(participant.debtMinor),
      0n,
    )
  }

  function financialSnapshot(group: any) {
    return JSON.stringify({
      members: group.members,
      tempUsers: group.tempUsers,
      records: group.records,
    })
  }

  function createResolveService(group: any) {
    const service = createService({
      findPublicUsersByIds: jest.fn(async (userIds: string[]) =>
        userIds.map((userId) => ({ userId, profile: { name: userId } })),
      ),
    }) as any
    service.loadGroupForMember = jest.fn(async () => group)
    service.runInOptionalTransaction = jest.fn(async (operation: any) =>
      operation(undefined),
    )
    return service
  }

  function createExecResult(value: any) {
    return {
      session: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(async () => value),
    }
  }

  function createGroupModel(options?: {
    existsResults?: any[]
    saveResults?: any[]
    findOneResult?: any
    findResults?: any[]
    countResult?: number
    updateOneResult?: any
  }) {
    const savedDocs: any[] = []
    const saveResults = [...(options?.saveResults ?? [])]
    const Model: any = jest.fn(function MockGroupModel(this: any, doc: any) {
      Object.assign(this, doc)
      this.save = jest.fn(async () => {
        const next = saveResults.shift()
        if (next instanceof Error) {
          throw next
        }
        savedDocs.push(this)
        return this
      })
    })
    const existsResults = [...(options?.existsResults ?? [])]
    Model.exists = jest.fn(async () =>
      existsResults.length ? existsResults.shift() : false,
    )
    Model.findOne = jest.fn(() => createExecResult(options?.findOneResult))
    Model.find = jest.fn(() => createExecResult(options?.findResults ?? []))
    Model.countDocuments = jest.fn(() =>
      createExecResult(options?.countResult ?? 0),
    )
    Model.updateOne = jest.fn(() =>
      createExecResult(options?.updateOneResult ?? { modifiedCount: 1 }),
    )
    return { Model, savedDocs }
  }

  it('creates groups with random uppercase 4-character codes', async () => {
    jest.spyOn(groupCode, 'generateGroupCode').mockReturnValue('AB12')
    const { Model, savedDocs } = createGroupModel()
    const service = createServiceWithModel(Model)

    await expect(service.createGroup('u1', { name: 'Trip' })).resolves.toEqual({
      code: 'AB12',
    })

    expect(Model.exists).toHaveBeenCalledWith({ code: 'AB12' })
    expect(savedDocs[0]).toEqual(
      expect.objectContaining({
        code: 'AB12',
        ownerUserId: 'u1',
        name: 'Trip',
        isDeleted: false,
      }),
    )
  })

  it('retries random group code collisions before saving', async () => {
    jest
      .spyOn(groupCode, 'generateGroupCode')
      .mockReturnValueOnce('AAAA')
      .mockReturnValueOnce('BBBB')
    const { Model, savedDocs } = createGroupModel({
      existsResults: [true, false],
    })
    const service = createServiceWithModel(Model)

    await expect(service.createGroup('u1', { name: 'Trip' })).resolves.toEqual({
      code: 'BBBB',
    })

    expect(Model).toHaveBeenCalledTimes(1)
    expect(savedDocs[0].code).toBe('BBBB')
  })

  it('retries duplicate key errors from the unique code index', async () => {
    jest
      .spyOn(groupCode, 'generateGroupCode')
      .mockReturnValueOnce('AAAA')
      .mockReturnValueOnce('BBBB')
    const duplicateKeyError = Object.assign(new Error('duplicate key'), {
      code: 11000,
      keyPattern: { code: 1 },
    })
    const { Model, savedDocs } = createGroupModel({
      saveResults: [duplicateKeyError],
    })
    const service = createServiceWithModel(Model)

    await expect(service.createGroup('u1', { name: 'Trip' })).resolves.toEqual({
      code: 'BBBB',
    })

    expect(Model).toHaveBeenCalledTimes(2)
    expect(savedDocs[0].code).toBe('BBBB')
  })

  it('does not hide duplicate key errors from unrelated legacy indexes', async () => {
    jest.spyOn(groupCode, 'generateGroupCode').mockReturnValue('AAAA')
    const duplicateIdxError = Object.assign(new Error('idx duplicate key'), {
      code: 11000,
      keyPattern: { idx: 1 },
    })
    const { Model } = createGroupModel({
      saveResults: [duplicateIdxError],
    })
    const service = createServiceWithModel(Model)

    await expect(service.createGroup('u1', { name: 'Trip' })).rejects.toBe(
      duplicateIdxError,
    )
    expect(Model).toHaveBeenCalledTimes(1)
  })

  it('fails group creation after exhausting code retries', async () => {
    jest.spyOn(groupCode, 'generateGroupCode').mockReturnValue('AAAA')
    const { Model, savedDocs } = createGroupModel({
      existsResults: Array.from({ length: 20 }, () => true),
    })
    const service = createServiceWithModel(Model)

    await expect(
      service.createGroup('u1', { name: 'Trip' }),
    ).rejects.toBeInstanceOf(GeneralException)
    expect(Model).not.toHaveBeenCalled()
    expect(savedDocs).toHaveLength(0)
  })

  it('soft deletes groups owned by the current user', async () => {
    const { Model } = createGroupModel()
    const service = createServiceWithModel(Model)

    await expect(service.dismissGroup('u1', 'AB12')).resolves.toEqual({
      code: 'AB12',
    })

    expect(Model.updateOne).toHaveBeenCalledWith(
      { code: 'AB12', ownerUserId: 'u1', isDeleted: { $ne: true } },
      {
        $set: expect.objectContaining({
          isDeleted: true,
          deletedBy: 'u1',
        }),
      },
    )
  })

  it('rejects group dismissal when no active owned group is updated', async () => {
    const { Model } = createGroupModel({
      updateOneResult: { modifiedCount: 0 },
    })
    const service = createServiceWithModel(Model)

    await expect(service.dismissGroup('u2', 'AB12')).rejects.toBeInstanceOf(
      GeneralException,
    )
  })

  it('excludes soft-deleted groups from my groups', async () => {
    const group = createPersistedGroup()
    const { Model } = createGroupModel({
      findResults: [group],
      countResult: 1,
    })
    const service = createServiceWithModel(Model)

    await service.myGroups('u1', {})

    expect(Model.find).toHaveBeenCalledWith({
      $or: [{ ownerUserId: 'u1' }, { 'members.userId': 'u1' }],
      isDeleted: { $ne: true },
    })
    expect(Model.countDocuments).toHaveBeenCalledWith({
      $or: [{ ownerUserId: 'u1' }, { 'members.userId': 'u1' }],
      isDeleted: { $ne: true },
    })
  })

  it('searches my groups before pagination', async () => {
    const { Model } = createGroupModel()
    const service = createServiceWithModel(Model)

    await service.myGroups('u1', { search: 'Trip.*', page: 1, pageSize: 10 })

    const filter = Model.find.mock.calls[0][0]
    expect(filter.$and[0]).toEqual({
      $or: [{ ownerUserId: 'u1' }, { 'members.userId': 'u1' }],
      isDeleted: { $ne: true },
    })
    expect(filter.$and[1].$or[0].name).toBeInstanceOf(RegExp)
    expect(filter.$and[1].$or[0].name.test('Trip.*')).toBe(true)
    expect(filter.$and[1].$or[0].name.test('TripX')).toBe(false)
    expect(Model.countDocuments).toHaveBeenCalledWith(filter)
  })

  function recordSearch(
    query: string,
    fields = ['note', 'categoryName'],
    operator = 'or',
  ) {
    return JSON.stringify({
      operator,
      conditions: fields.map((field) => ({ field, query })),
    })
  }

  it('filters group records by participant and structured search before pagination', async () => {
    const group = createPersistedGroup()
    group.records = [
      {
        recordId: 'record-dinner',
        who: 'u1',
        paidMinor: '1200',
        forWhom: ['u2'],
        type: 'food',
        text: 'Dinner noodles',
        createdAt: 300,
        modifiedAt: 300,
        createdBy: 'u1',
      },
      {
        recordId: 'record-hotel',
        who: 'u2',
        paidMinor: '2500',
        forWhom: ['tmp1'],
        type: 'accommodation',
        text: 'Hotel',
        createdAt: 200,
        modifiedAt: 200,
        createdBy: 'u2',
      },
      {
        recordId: 'record-taxi',
        who: 'tmp1',
        paidMinor: '800',
        forWhom: ['u1'],
        type: 'traffic',
        text: 'Taxi',
        createdAt: 100,
        modifiedAt: 100,
        createdBy: 'u1',
      },
    ]
    const service = createService() as any
    service.loadGroupForMember = jest.fn(async () => group)

    const result = await service.groupRecords('u1', 'AB12', {
      participantId: 'u1',
      search: recordSearch('taxi'),
      page: 1,
      pageSize: 10,
    })

    expect(result.total).toBe(1)
    expect(result.data).toEqual([
      expect.objectContaining({
        recordId: 'record-taxi',
        paidMinor: '800',
      }),
    ])
  })

  it('matches structured record search by localized category name', async () => {
    const group = createPersistedGroup()
    group.records = [
      {
        recordId: 'record-meal',
        who: 'u1',
        paidMinor: '1200',
        forWhom: ['u2'],
        type: 'food',
        text: '',
        createdAt: 300,
        modifiedAt: 300,
        createdBy: 'u1',
      },
      {
        recordId: 'record-transport',
        who: 'u2',
        paidMinor: '800',
        forWhom: ['u1'],
        type: 'traffic',
        text: '',
        createdAt: 200,
        modifiedAt: 200,
        createdBy: 'u2',
      },
    ]
    const service = createService() as any
    service.loadGroupForMember = jest.fn(async () => group)

    const result = await service.groupRecords('u1', 'AB12', {
      search: recordSearch('Meal'),
      page: 1,
      pageSize: 10,
    })

    expect(result.total).toBe(1)
    expect(result.data[0].recordId).toBe('record-meal')
  })

  it('does not match fields omitted from structured record search', async () => {
    const group = createPersistedGroup()
    group.records = [
      {
        recordId: 'record-amount',
        who: 'u1',
        paidMinor: '1200',
        forWhom: ['u2'],
        type: 'food',
        text: '',
        createdAt: 300,
        modifiedAt: 300,
        createdBy: 'u1',
      },
    ]
    const service = createService() as any
    service.loadGroupForMember = jest.fn(async () => group)

    const result = await service.groupRecords('u1', 'AB12', {
      search: recordSearch('1200'),
      page: 1,
      pageSize: 10,
    })

    expect(result.total).toBe(0)
    expect(result.data).toEqual([])
  })

  it('rejects scalar and unsupported structured record search', async () => {
    const group = createPersistedGroup()
    const service = createService() as any
    service.loadGroupForMember = jest.fn(async () => group)

    await expect(
      service.groupRecords('u1', 'AB12', { search: 'taxi' }),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.groupRecords('u1', 'AB12', {
        search: recordSearch('taxi', ['payer']),
      }),
    ).rejects.toBeInstanceOf(GeneralException)
  })

  it('rejects participant-filtered records for unknown participants', async () => {
    const group = createPersistedGroup()
    const service = createService() as any
    service.loadGroupForMember = jest.fn(async () => group)

    await expect(
      service.groupRecords('u1', 'AB12', { participantId: 'missing' }),
    ).rejects.toBeInstanceOf(GeneralException)
  })

  it('treats soft-deleted groups as inaccessible for normal group flows', async () => {
    const { Model } = createGroupModel({ findOneResult: null })
    const service = createServiceWithModel(Model)
    ;(service as any).runInOptionalTransaction = jest.fn(
      async (operation: any) => operation(undefined),
    )

    await expect(service.joinGroup('u2', 'AB12')).rejects.toBeInstanceOf(
      GeneralException,
    )
    await expect(service.getGroup('u1', 'AB12')).rejects.toBeInstanceOf(
      GeneralException,
    )
    await expect(
      service.archiveGroup('u1', 'AB12', true),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.renameGroup('u1', 'AB12', 'Next'),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.addTempUser('u1', 'AB12', 'Guest 2'),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.addRecord('u1', {
        groupCode: 'AB12',
        who: 'u1',
        paidMinor: '100',
        forWhom: ['u1'],
      }),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(service.groupRecords('u1', 'AB12', {})).rejects.toBeInstanceOf(
      GeneralException,
    )
    await expect(service.getRecord('u1', 'record-1')).rejects.toBeInstanceOf(
      GeneralException,
    )
  })

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

  it('adds normal records with exact balances and returns the authoritative group snapshot', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)

    const result = await service.addRecord('u1', {
      groupCode: '0000',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '121.1',
      lat: '31.2',
      createdAt: 1710086400000,
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        who: 'u1',
        paid: 300,
        paidMinor: '300',
        forWhom: ['u1', 'u2', 'tmp1'],
        type: 'food',
        text: 'Dinner',
        createdAt: 1710086400000,
      }),
    )
    expect(group.records).toHaveLength(1)
    expect(member(group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '200', costMinor: '100' }),
    )
    expect(member(group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '-100', costMinor: '100' }),
    )
    expect(tempUser(group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '-100', costMinor: '100' }),
    )
    expect(totalDebtMinor(group)).toBe(0n)
    expect(dtoMember((result as any).group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '200', costMinor: '100' }),
    )
    expect(dtoMember((result as any).group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '-100', costMinor: '100' }),
    )
    expect(dtoTempUser((result as any).group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '-100', costMinor: '100' }),
    )
    expect(group.save).toHaveBeenCalledTimes(1)
  })

  it('updates amount and timestamp by reversing the old record before applying the new record', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)
    seedRecord(service, group, {
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '',
      lat: '',
      isDebtResolve: false,
      createdAt: 1710000000000,
      modifiedAt: 1710000000000,
      createdBy: 'u1',
    })

    const result = await service.updateRecord('u1', {
      groupCode: '0000',
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '600',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'traffic',
      text: 'Taxi',
      long: '121.3',
      lat: '31.4',
      createdAt: 1710086400000,
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        recordId: 'record-1',
        paid: 600,
        paidMinor: '600',
        type: 'traffic',
        text: 'Taxi',
        long: '121.3',
        lat: '31.4',
        createdAt: 1710086400000,
        modifiedBy: 'u1',
      }),
    )
    expect(group.records[0]).toEqual(
      expect.objectContaining({
        paidMinor: '600',
        createdAt: 1710086400000,
        type: 'traffic',
        text: 'Taxi',
      }),
    )
    expect(member(group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '400', costMinor: '200' }),
    )
    expect(member(group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '-200', costMinor: '200' }),
    )
    expect(tempUser(group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '-200', costMinor: '200' }),
    )
    expect(totalDebtMinor(group)).toBe(0n)
    expect(dtoMember((result as any).group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '400', costMinor: '200' }),
    )
    expect(dtoMember((result as any).group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '-200', costMinor: '200' }),
    )
    expect(dtoTempUser((result as any).group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '-200', costMinor: '200' }),
    )
  })

  it('updates payer and split members across formal and temporary participants exactly', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)
    seedRecord(service, group, {
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '',
      lat: '',
      isDebtResolve: false,
      createdAt: 1710000000000,
      modifiedAt: 1710000000000,
      createdBy: 'u1',
    })

    const result = await service.updateRecord('u1', {
      groupCode: '0000',
      recordId: 'record-1',
      who: 'u2',
      paidMinor: '450',
      forWhom: ['u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '',
      lat: '',
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        recordId: 'record-1',
        who: 'u2',
        paidMinor: '450',
        forWhom: ['u2', 'tmp1'],
      }),
    )
    expect(member(group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
    expect(member(group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '225', costMinor: '225' }),
    )
    expect(tempUser(group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '-225', costMinor: '225' }),
    )
    expect(totalDebtMinor(group)).toBe(0n)
    expect(dtoMember((result as any).group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '225', costMinor: '225' }),
    )
    expect(dtoTempUser((result as any).group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '-225', costMinor: '225' }),
    )
  })

  it('updates non-money fields without balance drift', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)
    seedRecord(service, group, {
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '',
      lat: '',
      isDebtResolve: false,
      createdAt: 1710000000000,
      modifiedAt: 1710000000000,
      createdBy: 'u1',
    })
    const beforeBalances = JSON.stringify({
      members: group.members,
      tempUsers: group.tempUsers,
    })

    const result = await service.updateRecord('u1', {
      groupCode: '0000',
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'traffic',
      text: 'Airport taxi',
      long: '',
      lat: '',
      createdAt: 1710086400000,
    } as any)

    expect(
      JSON.stringify({ members: group.members, tempUsers: group.tempUsers }),
    ).toBe(beforeBalances)
    expect(result).toEqual(
      expect.objectContaining({
        recordId: 'record-1',
        paidMinor: '300',
        type: 'traffic',
        text: 'Airport taxi',
        createdAt: 1710086400000,
      }),
    )
    expect(dtoMember((result as any).group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '200', costMinor: '100' }),
    )
  })

  it('updates negative uneven values without residual debt', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)
    seedRecord(service, group, {
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '',
      lat: '',
      isDebtResolve: false,
      createdAt: 1710000000000,
      modifiedAt: 1710000000000,
      createdBy: 'u1',
    })

    const result = await service.updateRecord('u1', {
      groupCode: '0000',
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '-100',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Refund',
      long: '',
      lat: '',
    } as any)

    expect(result).toEqual(
      expect.objectContaining({
        recordId: 'record-1',
        paid: -100,
        paidMinor: '-100',
      }),
    )
    expect(member(group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '-66', costMinor: '-34' }),
    )
    expect(member(group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '33', costMinor: '-33' }),
    )
    expect(tempUser(group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '33', costMinor: '-33' }),
    )
    expect(totalDebtMinor(group)).toBe(0n)
    expect(dtoTempUser((result as any).group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '33', costMinor: '-33' }),
    )
  })

  it('deletes records by reversing every balance contribution and returns the updated group', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)
    seedRecord(service, group, {
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '',
      lat: '',
      isDebtResolve: false,
      createdAt: 1710000000000,
      modifiedAt: 1710000000000,
      createdBy: 'u1',
    })

    const result = await service.dropRecord('u1', '0000', 'record-1')

    expect(result).toEqual(
      expect.objectContaining({
        groupCode: '0000',
        recordId: 'record-1',
      }),
    )
    expect(group.records).toHaveLength(0)
    expect(member(group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
    expect(member(group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
    expect(tempUser(group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
    expect(totalDebtMinor(group)).toBe(0n)
    expect(dtoMember((result as any).group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
    expect(dtoTempUser((result as any).group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
  })

  it('rejects failed add, update, and delete mutations without changing financial state', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)
    seedRecord(service, group, {
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '300',
      forWhom: ['u1', 'u2', 'tmp1'],
      type: 'food',
      text: 'Dinner',
      long: '',
      lat: '',
      isDebtResolve: false,
      createdAt: 1710000000000,
      modifiedAt: 1710000000000,
      createdBy: 'u1',
    })
    const snapshot = financialSnapshot(group)

    await expect(
      service.addRecord('u1', {
        groupCode: '0000',
        who: 'missing',
        paidMinor: '100',
        forWhom: ['u1'],
      } as any),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.updateRecord('u1', {
        groupCode: '0000',
        recordId: 'record-1',
        who: 'u1',
        paidMinor: '0',
        forWhom: ['u1'],
      } as any),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.updateRecord('u1', {
        groupCode: '0000',
        recordId: 'missing-record',
        who: 'u1',
        paidMinor: '100',
        forWhom: ['u1'],
      } as any),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.updateRecord('u1', {
        groupCode: '0000',
        recordId: 'record-1',
        who: 'u1',
        paidMinor: '100',
        forWhom: [],
      } as any),
    ).rejects.toBeInstanceOf(GeneralException)
    await expect(
      service.dropRecord('u1', '0000', 'missing-record'),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(financialSnapshot(group)).toBe(snapshot)
    expect(group.save).not.toHaveBeenCalled()
  })

  it('keeps debt-resolution records immutable without changing financial state', async () => {
    const group = createPersistedGroup()
    const service = createResolveService(group)
    seedRecord(service, group, {
      recordId: 'resolve-1',
      who: 'u1',
      paidMinor: '80',
      forWhom: ['u2'],
      type: 'debtResolve',
      text: 'Debt Resolve',
      long: '',
      lat: '',
      isDebtResolve: true,
      createdAt: 1710000000000,
      modifiedAt: 1710000000000,
      createdBy: 'u1',
    })
    const snapshot = financialSnapshot(group)

    await expect(
      service.updateRecord('u1', {
        groupCode: '0000',
        recordId: 'resolve-1',
        who: 'u1',
        paidMinor: '100',
        forWhom: ['u2'],
      } as any),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(financialSnapshot(group)).toBe(snapshot)
    expect(group.save).not.toHaveBeenCalled()
  })

  it('rejects add record limit without persisting or changing balances', async () => {
    const group = createPersistedGroup()
    group.records = Array.from({ length: 5000 }, (_, index) => ({
      recordId: `record-${index}`,
      who: 'u1',
      paidMinor: '1',
      forWhom: ['u1'],
      isDebtResolve: false,
    }))
    const service = createResolveService(group)
    const snapshot = financialSnapshot(group)

    await expect(
      service.addRecord('u1', {
        groupCode: '0000',
        who: 'u1',
        paidMinor: '100',
        forWhom: ['u1'],
      } as any),
    ).rejects.toBeInstanceOf(GeneralException)

    expect(financialSnapshot(group)).toBe(snapshot)
    expect(group.save).not.toHaveBeenCalled()
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

    const result = await service.resolveDebts('u1', {
      groupCode: '0000',
      transfers: [
        { from: 'u1', to: 'u2', amountMinor: '80' },
        { from: 'u1', to: 'tmp1', amountMinor: '40' },
      ],
    })

    const records = result.records
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
    expect(dtoMember(result.group, 'u1')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
    expect(dtoMember(result.group, 'u2')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
    expect(dtoTempUser(result.group, 'tmp1')).toEqual(
      expect.objectContaining({ debtMinor: '0', costMinor: '0' }),
    )
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
