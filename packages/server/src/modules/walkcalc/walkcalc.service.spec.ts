import { from, lastValueFrom } from 'rxjs'
import { GeneralException } from '../../exceptions/general-exceptions'
import { StructuredResponseInterceptor } from '../../interceptors/response/structured-response'
import * as groupCode from './utils/group-code'
import { WalkcalcService } from './walkcalc.service'

type AnyDoc = Record<string, any>
type Identity = (doc: AnyDoc) => string

interface FakeModelStore {
  Model: any
  docs: AnyDoc[]
  failNextSave?: Error
  failSaveWhen?: (doc: AnyDoc) => Error | undefined
  failUpdateWhen?: (
    filter: AnyDoc,
    update: AnyDoc,
    doc: AnyDoc,
  ) => Error | undefined
  snapshot: () => AnyDoc[]
  restore: (snapshot: AnyDoc[]) => void
}

interface TestContext {
  service: WalkcalcService
  groupStore: FakeModelStore
  participantStore: FakeModelStore
  recordStore: FakeModelStore
  projectionStore: FakeModelStore
  userService: any
  session: {
    withTransaction: jest.Mock
    endSession: jest.Mock
  }
}

interface SeedData {
  groups: AnyDoc[]
  participants: AnyDoc[]
  records: AnyDoc[]
  projections: AnyDoc[]
  users: Record<string, AnyDoc>
}

const defaultUsers = {
  u1: { userId: 'u1', profile: { name: 'Hong', avatar: 'u1.png' } },
  u2: { userId: 'u2', profile: { name: 'Ada', avatar: 'u2.png' } },
  u3: { userId: 'u3', profile: { name: 'Grace', avatar: 'u3.png' } },
}

describe('WalkcalcService normalized ledger', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('creates a group with normalized participant and zero projection documents', async () => {
    jest.spyOn(groupCode, 'generateGroupCode').mockReturnValue('AB12')
    const ctx = createContext()

    await expect(
      ctx.service.createGroup('u1', { name: 'Trip' }),
    ).resolves.toEqual({
      code: 'AB12',
    })

    expect(ctx.groupStore.docs).toEqual([
      expect.objectContaining({
        code: 'AB12',
        ownerUserId: 'u1',
        name: 'Trip',
        archivedUserIds: [],
        isDeleted: false,
      }),
    ])
    expect(ctx.participantStore.docs).toEqual([
      expect.objectContaining({
        groupCode: 'AB12',
        participantId: 'u1',
        kind: 'user',
        userId: 'u1',
      }),
    ])
    expect(ctx.projectionStore.docs).toEqual([
      expect.objectContaining({
        groupCode: 'AB12',
        participantId: 'u1',
        balanceValue: '0',
        expenseShareValue: '0',
        paidTotalValue: '0',
        recordCount: 0,
      }),
    ])
  })

  it('lists paginated groups while home summary includes archived and unpaged groups', async () => {
    const ctx = createContext({
      groups: [
        groupDoc({
          code: 'AB12',
          name: 'Archived Trip',
          modifiedAt: 300,
          archivedUserIds: ['u1'],
        }),
        groupDoc({ code: 'CD34', name: 'Next Trip', modifiedAt: 200 }),
      ],
      participants: [
        userParticipant('AB12', 'u1'),
        userParticipant('AB12', 'u2'),
        tempParticipant('AB12', 'tmp1', 'Guest'),
        userParticipant('CD34', 'u1'),
      ],
      projections: [
        projection('AB12', 'u1', { balanceValue: '1000' }),
        projection('CD34', 'u1', { balanceValue: '-250' }),
      ],
    })

    await expect(ctx.service.homeSummary('u1')).resolves.toEqual({
      totalBalance: '7.50',
    })
    await expect(
      ctx.service.myGroups('u1', { page: 1, pageSize: 1 }),
    ).resolves.toEqual({
      data: [
        expect.objectContaining({
          code: 'AB12',
          archivedUserIds: ['u1'],
          currentUserBalance: '10.00',
          participantCount: 3,
          participantPreview: [
            expect.objectContaining({
              participantId: 'u1',
              kind: 'user',
              userId: 'u1',
              profile: { name: 'Hong', avatar: 'u1.png' },
            }),
            expect.objectContaining({
              participantId: 'u2',
              kind: 'user',
              userId: 'u2',
              profile: { name: 'Ada', avatar: 'u2.png' },
            }),
            expect.objectContaining({
              participantId: 'tmp1',
              kind: 'tempUser',
              tempName: 'Guest',
              profile: undefined,
            }),
          ],
        }),
      ],
      total: 2,
      page: 1,
      pageSize: 1,
    })
    expect(ctx.userService.findPublicUsersByIds).toHaveBeenCalledWith([
      'u1',
      'u2',
    ])
  })

  it('resolves formal participant profiles from UserService without storing display copies', async () => {
    const ctx = createSeededGroupContext()

    const group = await ctx.service.getGroup('u1', 'AB12')
    const balances = await ctx.service.groupBalances('u1', 'AB12')

    expect(group.participants).toEqual([
      expect.objectContaining({
        participantId: 'u1',
        kind: 'user',
        profile: { name: 'Hong', avatar: 'u1.png' },
      }),
      expect.objectContaining({
        participantId: 'u2',
        kind: 'user',
        profile: { name: 'Ada', avatar: 'u2.png' },
      }),
      expect.objectContaining({
        participantId: 'tmp1',
        kind: 'tempUser',
        tempName: 'Guest',
        profile: undefined,
      }),
    ])
    expect(balances.participants).toHaveLength(3)
    expect(
      ctx.participantStore.docs.find((doc) => doc.participantId === 'u2'),
    ).toEqual(
      expect.not.objectContaining({
        profile: expect.anything(),
        name: expect.anything(),
      }),
    )
  })

  it('adds, updates, deletes expenses and keeps projections equal to a rebuild oracle', async () => {
    const ctx = createSeededGroupContext()

    const added = await ctx.service.addRecord('u1', {
      groupCode: 'AB12',
      type: 'expense',
      amount: '100.00',
      payerId: 'u1',
      participantIds: ['u1', 'u2', 'tmp1'],
      category: 'food',
      note: 'Dinner',
      createdAt: 300,
    })

    expect(added.record).toEqual(
      expect.objectContaining({
        groupCode: 'AB12',
        type: 'expense',
        amount: '100.00',
        payerId: 'u1',
        participantIds: ['u1', 'u2', 'tmp1'],
        involvedParticipantIds: ['u1', 'u2', 'tmp1'],
        note: 'Dinner',
      }),
    )
    expect(added.record).not.toHaveProperty('paidMinor')
    expectProjection(ctx, 'u1', {
      balanceValue: '6666',
      expenseShareValue: '3334',
      paidTotalValue: '10000',
      recordCount: 1,
    })
    expectProjection(ctx, 'u2', {
      balanceValue: '-3333',
      expenseShareValue: '3333',
      paidTotalValue: '0',
      recordCount: 1,
    })
    expectProjection(ctx, 'tmp1', {
      balanceValue: '-3333',
      expenseShareValue: '3333',
      recordCount: 1,
    })
    expectBalanceSumZero(ctx)
    await expectRebuildMatches(ctx)

    const updated = await ctx.service.updateRecord('u1', {
      groupCode: 'AB12',
      recordId: added.record.recordId,
      type: 'expense',
      amount: '90.00',
      payerId: 'u2',
      participantIds: ['u2', 'tmp1'],
      category: 'traffic',
      note: 'Taxi',
    })

    expect(updated.record).toEqual(
      expect.objectContaining({
        recordId: added.record.recordId,
        amount: '90.00',
        payerId: 'u2',
        participantIds: ['u2', 'tmp1'],
        category: 'traffic',
        note: 'Taxi',
        createdAt: 300,
        updatedBy: 'u1',
      }),
    )
    expectProjection(ctx, 'u1', {
      balanceValue: '0',
      expenseShareValue: '0',
      paidTotalValue: '0',
      recordCount: 0,
    })
    expectProjection(ctx, 'u2', {
      balanceValue: '4500',
      expenseShareValue: '4500',
      paidTotalValue: '9000',
      recordCount: 1,
    })
    expectProjection(ctx, 'tmp1', {
      balanceValue: '-4500',
      expenseShareValue: '4500',
      paidTotalValue: '0',
      recordCount: 1,
    })
    expectBalanceSumZero(ctx)
    await expectRebuildMatches(ctx)

    await expect(
      ctx.service.dropRecord('u1', 'AB12', added.record.recordId),
    ).resolves.toEqual(
      expect.objectContaining({
        groupCode: 'AB12',
        recordId: added.record.recordId,
      }),
    )
    expect(ctx.recordStore.docs).toHaveLength(0)
    expectProjection(ctx, 'u1', zeroProjectionValues)
    expectProjection(ctx, 'u2', zeroProjectionValues)
    expectProjection(ctx, 'tmp1', zeroProjectionValues)
    expectBalanceSumZero(ctx)
    await expectRebuildMatches(ctx)
  })

  it('updates an expense without replacing Mongo _id and keeps exact projections through drop', async () => {
    const ctx = createContext({
      groups: [groupDoc({ code: 'AB12', ownerUserId: 'A' })],
      participants: [
        userParticipant('AB12', 'A'),
        userParticipant('AB12', 'B'),
        userParticipant('AB12', 'C'),
        tempParticipant('AB12', 'T', 'Temp'),
      ],
      projections: [
        projection('AB12', 'A'),
        projection('AB12', 'B'),
        projection('AB12', 'C'),
        projection('AB12', 'T', { kind: 'tempUser' }),
      ],
      users: {
        A: { userId: 'A', profile: { name: 'A' } },
        B: { userId: 'B', profile: { name: 'B' } },
        C: { userId: 'C', profile: { name: 'C' } },
      },
    })

    const first = await ctx.service.addRecord('A', {
      groupCode: 'AB12',
      type: 'expense',
      amount: '100.00',
      payerId: 'A',
      participantIds: ['A', 'B', 'T'],
      category: 'food',
      createdAt: 1710000000000,
    })
    await ctx.service.addRecord('A', {
      groupCode: 'AB12',
      type: 'expense',
      amount: '10.00',
      payerId: 'B',
      participantIds: ['A', 'B', 'C'],
      category: 'food',
      createdAt: 1710000001000,
    })
    const storedRecordId = ctx.recordStore.docs.find(
      (record) => record.recordId === first.record.recordId,
    )?._id

    const updated = await ctx.service.updateRecord('A', {
      groupCode: 'AB12',
      recordId: first.record.recordId,
      type: 'expense',
      amount: '120.00',
      payerId: 'B',
      participantIds: ['B', 'T'],
      category: 'traffic',
      note: 'Updated',
      createdAt: 1710000002000,
    })

    expect(ctx.recordStore.Model.replaceOne).not.toHaveBeenCalled()
    expect(
      ctx.recordStore.docs.find(
        (record) => record.recordId === first.record.recordId,
      )?._id,
    ).toBe(storedRecordId)
    expect(updated.record).toEqual(
      expect.objectContaining({
        recordId: first.record.recordId,
        createdBy: 'A',
        createdAt: 1710000000000,
        updatedBy: 'A',
      }),
    )
    await expect(ctx.service.groupBalances('A', 'AB12')).resolves.toEqual(
      expect.objectContaining({
        participants: expect.arrayContaining([
          expect.objectContaining({
            participantId: 'A',
            balance: '-3.34',
            expenseShare: '3.34',
            paidTotal: '0.00',
            recordCount: 1,
          }),
          expect.objectContaining({
            participantId: 'B',
            balance: '66.67',
            expenseShare: '63.33',
            paidTotal: '130.00',
            recordCount: 2,
          }),
          expect.objectContaining({
            participantId: 'C',
            balance: '-3.33',
            expenseShare: '3.33',
            paidTotal: '0.00',
            recordCount: 1,
          }),
          expect.objectContaining({
            participantId: 'T',
            balance: '-60.00',
            expenseShare: '60.00',
            paidTotal: '0.00',
            recordCount: 1,
          }),
        ]),
      }),
    )

    await ctx.service.dropRecord('A', 'AB12', first.record.recordId)

    await expect(ctx.service.groupBalances('A', 'AB12')).resolves.toEqual(
      expect.objectContaining({
        participants: expect.arrayContaining([
          expect.objectContaining({
            participantId: 'A',
            balance: '-3.34',
            expenseShare: '3.34',
            paidTotal: '0.00',
            recordCount: 1,
          }),
          expect.objectContaining({
            participantId: 'B',
            balance: '6.67',
            expenseShare: '3.33',
            paidTotal: '10.00',
            recordCount: 1,
          }),
          expect.objectContaining({
            participantId: 'C',
            balance: '-3.33',
            expenseShare: '3.33',
            paidTotal: '0.00',
            recordCount: 1,
          }),
          expect.objectContaining({
            participantId: 'T',
            balance: '0.00',
            expenseShare: '0.00',
            paidTotal: '0.00',
            recordCount: 0,
          }),
        ]),
      }),
    )
    expectBalanceSumZero(ctx)
    await expectRebuildMatches(ctx)
  })

  it('adds, updates, and deletes settlement records without changing expense share', async () => {
    const ctx = createSeededGroupContext()

    const added = await ctx.service.addRecord('u1', {
      groupCode: 'AB12',
      type: 'settlement',
      amount: '12.50',
      fromId: 'u2',
      toId: 'u1',
    })

    expect(added.record).toEqual(
      expect.objectContaining({
        type: 'settlement',
        amount: '12.50',
        fromId: 'u2',
        toId: 'u1',
        category: 'settlement',
      }),
    )
    expectProjection(ctx, 'u2', {
      balanceValue: '1250',
      expenseShareValue: '0',
      settlementOutValue: '1250',
      recordCount: 1,
    })
    expectProjection(ctx, 'u1', {
      balanceValue: '-1250',
      expenseShareValue: '0',
      settlementInValue: '1250',
      recordCount: 1,
    })
    expectBalanceSumZero(ctx)

    await ctx.service.updateRecord('u1', {
      groupCode: 'AB12',
      recordId: added.record.recordId,
      type: 'settlement',
      amount: '5.00',
      fromId: 'u1',
      toId: 'u2',
    })
    expectProjection(ctx, 'u1', {
      balanceValue: '500',
      expenseShareValue: '0',
      settlementInValue: '0',
      settlementOutValue: '500',
      recordCount: 1,
    })
    expectProjection(ctx, 'u2', {
      balanceValue: '-500',
      expenseShareValue: '0',
      settlementInValue: '500',
      settlementOutValue: '0',
      recordCount: 1,
    })
    expectBalanceSumZero(ctx)

    await ctx.service.dropRecord('u1', 'AB12', added.record.recordId)
    expectProjection(ctx, 'u1', zeroProjectionValues)
    expectProjection(ctx, 'u2', zeroProjectionValues)
    expectBalanceSumZero(ctx)
  })

  it('suggests exact minimum settlements and resolves all balances with settlement records', async () => {
    const ctx = createSeededGroupContext()
    await ctx.service.addRecord('u1', {
      groupCode: 'AB12',
      type: 'expense',
      amount: '90.00',
      payerId: 'u1',
      participantIds: ['u1', 'u2', 'tmp1'],
      category: 'food',
    })

    await expect(
      ctx.service.settlementSuggestion('u1', 'AB12'),
    ).resolves.toEqual({
      groupCode: 'AB12',
      strategy: 'exact',
      transfers: [
        { fromId: 'u2', toId: 'u1', amount: '30.00' },
        { fromId: 'tmp1', toId: 'u1', amount: '30.00' },
      ],
    })

    const resolved = await ctx.service.resolveSettlements('u1', 'AB12', {})

    expect(resolved.records).toEqual([
      expect.objectContaining({
        type: 'settlement',
        amount: '30.00',
        fromId: 'u2',
        toId: 'u1',
      }),
      expect.objectContaining({
        type: 'settlement',
        amount: '30.00',
        fromId: 'tmp1',
        toId: 'u1',
      }),
    ])
    expectProjection(ctx, 'u1', {
      balanceValue: '0',
      expenseShareValue: '3000',
      paidTotalValue: '9000',
      settlementInValue: '6000',
      settlementOutValue: '0',
      recordCount: 3,
    })
    expectProjection(ctx, 'u2', {
      balanceValue: '0',
      expenseShareValue: '3000',
      settlementInValue: '0',
      settlementOutValue: '3000',
      recordCount: 2,
    })
    expectProjection(ctx, 'tmp1', {
      balanceValue: '0',
      expenseShareValue: '3000',
      settlementInValue: '0',
      settlementOutValue: '3000',
      recordCount: 2,
    })
    expect(ctx.recordStore.docs).toHaveLength(3)
    await expectRebuildMatches(ctx)
  })

  it('filters records and participant balance details with accurate totals before pagination', async () => {
    const ctx = createContext({
      groups: [groupDoc({ code: 'AB12' })],
      participants: [
        userParticipant('AB12', 'u1'),
        userParticipant('AB12', 'u2'),
        tempParticipant('AB12', 'tmp1', 'Guest'),
      ],
      projections: [
        projection('AB12', 'u1', { recordCount: 2 }),
        projection('AB12', 'u2', { recordCount: 2 }),
        projection('AB12', 'tmp1', { recordCount: 1 }),
      ],
      records: [
        expenseRecord({
          recordId: 'r1',
          amountValue: '10000',
          payerId: 'u1',
          participantIds: ['u1', 'u2'],
          involvedParticipantIds: ['u1', 'u2'],
          category: 'food',
          note: 'Dinner noodles',
          createdAt: 300,
        }),
        settlementRecord({
          recordId: 'r2',
          amountValue: '5000',
          fromId: 'u2',
          toId: 'u1',
          involvedParticipantIds: ['u2', 'u1'],
          note: 'Transfer',
          createdAt: 200,
        }),
        expenseRecord({
          recordId: 'r3',
          amountValue: '800',
          payerId: 'tmp1',
          participantIds: ['tmp1'],
          involvedParticipantIds: ['tmp1'],
          category: 'traffic',
          note: 'Taxi',
          createdAt: 100,
        }),
      ],
    })

    await expect(
      ctx.service.groupRecords('u1', 'AB12', {
        participantId: 'u2',
        page: 1,
        pageSize: 1,
      }),
    ).resolves.toEqual({
      data: [
        expect.objectContaining({
          recordId: 'r1',
          type: 'expense',
          amount: '100.00',
        }),
      ],
      total: 2,
      page: 1,
      pageSize: 1,
    })

    await expect(
      ctx.service.groupRecords('u1', 'AB12', {
        search: structuredSearch('Meal', ['categoryName']),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [expect.objectContaining({ recordId: 'r1' })],
        total: 1,
      }),
    )

    await expect(
      ctx.service.participantBalanceDetail('u1', 'AB12', 'tmp1', {
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        participantId: 'tmp1',
        tempName: 'Guest',
        records: [expect.objectContaining({ recordId: 'r3' })],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
    )
  })

  it('rejects archive until every participant balance is zero', async () => {
    const ctx = createSeededGroupContext()
    projectionDoc(ctx, 'u1').balanceValue = '0'
    projectionDoc(ctx, 'u2').balanceValue = '1000'
    projectionDoc(ctx, 'tmp1').balanceValue = '-1000'

    await expect(ctx.service.archiveGroup('u1', 'AB12', true)).rejects.toEqual(
      expect.objectContaining({ message: 'walkcalc.groupUnsettled' }),
    )
    expect(ctx.groupStore.docs[0].archivedUserIds).toEqual([])

    projectionDoc(ctx, 'u2').balanceValue = '0'
    projectionDoc(ctx, 'tmp1').balanceValue = '0'
    await expect(ctx.service.archiveGroup('u1', 'AB12', true)).resolves.toEqual(
      {
        code: 'AB12',
      },
    )
    expect(ctx.groupStore.docs[0].archivedUserIds).toEqual(['u1'])
  })

  it('keeps failed mutations atomic across validation, authorization, persistence, and limit errors', async () => {
    const ctx = createSeededGroupContext()

    await expect(
      ctx.service.addRecord('u1', {
        groupCode: 'AB12',
        type: 'expense',
        amount: '12.00',
        payerId: 'u1',
        participantIds: ['missing'],
      }),
    ).rejects.toBeInstanceOf(GeneralException)
    expect(ctx.recordStore.docs).toHaveLength(0)
    expect(projectionSnapshot(ctx)).toEqual(seededZeroSnapshot())

    await expect(
      ctx.service.addRecord('u1', {
        groupCode: 'AB12',
        type: 'expense',
        amount: '0.00',
        payerId: 'u1',
        participantIds: ['u1'],
      }),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'walkcalc.invalidMoneyAmount' }),
    )
    await expect(
      ctx.service.addRecord('u3', {
        groupCode: 'AB12',
        type: 'expense',
        amount: '12.00',
        payerId: 'u1',
        participantIds: ['u1'],
      }),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'walkcalc.groupNotFoundOrNoAccess' }),
    )
    await expect(
      ctx.service.updateRecord('u1', {
        groupCode: 'AB12',
        recordId: 'missing',
        type: 'expense',
        amount: '12.00',
        payerId: 'u1',
        participantIds: ['u1'],
      }),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'walkcalc.recordNotFound' }),
    )
    await expect(
      ctx.service.dropRecord('u1', 'AB12', 'missing'),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'walkcalc.recordNotFound' }),
    )
    await expect(
      ctx.service.addTempUser('u1', 'AB12', 'Guest'),
    ).rejects.toEqual(
      expect.objectContaining({ message: 'walkcalc.tempUserNameExists' }),
    )
    expect(ctx.recordStore.docs).toHaveLength(0)
    expect(projectionSnapshot(ctx)).toEqual(seededZeroSnapshot())

    const beforePersistenceFailure = ledgerSnapshot(ctx)
    ctx.projectionStore.failSaveWhen = (doc) =>
      doc.participantId === 'u2'
        ? new Error('projection write failed')
        : undefined
    await expect(
      ctx.service.addRecord('u1', {
        groupCode: 'AB12',
        type: 'expense',
        amount: '30.00',
        payerId: 'u1',
        participantIds: ['u1', 'u2', 'tmp1'],
      }),
    ).rejects.toThrow('projection write failed')
    ctx.projectionStore.failSaveWhen = undefined
    expect(ledgerSnapshot(ctx)).toEqual(beforePersistenceFailure)

    const limitCtx = createSettlementLimitContext()
    await expect(
      limitCtx.service.settlementSuggestion('u1', 'BIG1'),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'walkcalc.settlementLimitExceeded',
        data: { limit: 12, nonZeroParticipantCount: 13 },
      }),
    )
  })

  it('rolls back fallback update changes when a post-record step fails', async () => {
    const ctx = createSeededGroupContext()
    const added = await ctx.service.addRecord('u1', {
      groupCode: 'AB12',
      type: 'expense',
      amount: '100.00',
      payerId: 'u1',
      participantIds: ['u1', 'u2', 'tmp1'],
      category: 'food',
      createdAt: 300,
    })
    ctx.session.withTransaction.mockImplementation(async () => {
      throw new Error(
        'Transaction numbers are only allowed on a replica set member or mongos',
      )
    })
    const beforeRecords = ctx.recordStore.docs.map(stripDocument)
    const beforeProjections = projectionSnapshot(ctx)
    ctx.groupStore.failSaveWhen = () => new Error('group save failed')

    await expect(
      ctx.service.updateRecord('u1', {
        groupCode: 'AB12',
        recordId: added.record.recordId,
        type: 'expense',
        amount: '120.00',
        payerId: 'u2',
        participantIds: ['u2', 'tmp1'],
        category: 'traffic',
      }),
    ).rejects.toThrow('group save failed')

    expect(ctx.recordStore.docs.map(stripDocument)).toEqual(beforeRecords)
    expect(projectionSnapshot(ctx)).toEqual(beforeProjections)
  })

  it('maps duplicate participant ids to a structured business response', async () => {
    const ctx = createSeededGroupContext()
    const interceptor = new StructuredResponseInterceptor({
      t: jest.fn((key: string) => key),
    } as any)

    await expect(
      lastValueFrom(
        interceptor.intercept({} as any, {
          handle: () =>
            from(
              ctx.service.addRecord('u1', {
                groupCode: 'AB12',
                type: 'expense',
                amount: '1.00',
                payerId: 'u1',
                participantIds: ['u1', 'u1'],
              }),
            ),
        }),
      ),
    ).resolves.toEqual({
      isSuccess: false,
      msg: 'walkcalc.invalidParticipant',
      errCode: undefined,
      data: null,
    })
  })
})

const zeroProjectionValues = {
  balanceValue: '0',
  expenseShareValue: '0',
  paidTotalValue: '0',
  settlementInValue: '0',
  settlementOutValue: '0',
  recordCount: 0,
}

function createSeededGroupContext() {
  return createContext({
    groups: [groupDoc({ code: 'AB12' })],
    participants: [
      userParticipant('AB12', 'u1'),
      userParticipant('AB12', 'u2'),
      tempParticipant('AB12', 'tmp1', 'Guest'),
    ],
    projections: [
      projection('AB12', 'u1'),
      projection('AB12', 'u2'),
      projection('AB12', 'tmp1', { kind: 'tempUser' }),
    ],
  })
}

function createSettlementLimitContext() {
  const participants: AnyDoc[] = [userParticipant('BIG1', 'u1')]
  const projections: AnyDoc[] = [
    projection('BIG1', 'u1', { balanceValue: '100' }),
  ]
  for (let index = 2; index <= 12; index += 1) {
    const participantId = `p${index}`
    participants.push(tempParticipant('BIG1', participantId, participantId))
    projections.push(
      projection('BIG1', participantId, {
        kind: 'tempUser',
        balanceValue: '100',
      }),
    )
  }
  participants.push(tempParticipant('BIG1', 'p13', 'p13'))
  projections.push(
    projection('BIG1', 'p13', { kind: 'tempUser', balanceValue: '-1200' }),
  )

  return createContext({
    groups: [groupDoc({ code: 'BIG1' })],
    participants,
    projections,
  })
}

function createContext(seed: Partial<SeedData> = {}): TestContext {
  const groupStore = createFakeModel(seed.groups ?? [], (doc) => doc.code)
  const participantStore = createFakeModel(
    seed.participants ?? [],
    (doc) => `${doc.groupCode}:${doc.participantId}`,
  )
  const recordStore = createFakeModel(
    seed.records ?? [],
    (doc) => `${doc.groupCode}:${doc.recordId}`,
  )
  const projectionStore = createFakeModel(
    seed.projections ?? [],
    (doc) => `${doc.groupCode}:${doc.participantId}`,
  )
  const stores = [groupStore, participantStore, recordStore, projectionStore]
  const users = new Map(
    Object.entries({ ...defaultUsers, ...(seed.users ?? {}) }),
  )
  const userService = {
    findUserById: jest.fn(async (userId: string) => {
      const user = users.get(userId)
      if (!user) {
        throw new Error('missing user')
      }
      return deepClone(user)
    }),
    findPublicUsersByIds: jest.fn(async (userIds: string[]) =>
      userIds
        .filter((userId) => users.has(userId))
        .map((userId) => deepClone(users.get(userId))),
    ),
    searchPublicUsersByName: jest.fn(async (name: string, limit: number) =>
      [...users.values()]
        .filter((user) =>
          String(user.profile?.name ?? '')
            .toLowerCase()
            .includes(name.toLowerCase()),
        )
        .slice(0, limit)
        .map(deepClone),
    ),
  }
  const session = {
    withTransaction: jest.fn(async (operation: () => Promise<unknown>) => {
      const snapshots = stores.map((store) => store.snapshot())
      try {
        return await operation()
      } catch (err) {
        stores.forEach((store, index) => store.restore(snapshots[index]))
        throw err
      }
    }),
    endSession: jest.fn(async () => undefined),
  }
  const connection = {
    startSession: jest.fn(async () => session),
  }

  return {
    service: new WalkcalcService(
      groupStore.Model,
      participantStore.Model,
      recordStore.Model,
      projectionStore.Model,
      connection as any,
      userService as any,
    ),
    groupStore,
    participantStore,
    recordStore,
    projectionStore,
    userService,
    session,
  }
}

function createFakeModel(seed: AnyDoc[], identity: Identity): FakeModelStore {
  let nextObjectId = 1
  const store: FakeModelStore = {
    Model: undefined,
    docs: [],
    snapshot: () => store.docs.map(stripDocument),
    restore: (snapshot) => {
      store.docs.splice(
        0,
        store.docs.length,
        ...snapshot.map((doc) =>
          attachDocument(deepClone(doc), store, identity),
        ),
      )
    },
  }

  const Model: any = jest.fn(function MockModel(this: AnyDoc, doc: AnyDoc) {
    Object.assign(this, { _id: `mock-id-${nextObjectId++}` }, deepClone(doc))
    attachDocument(this, store, identity)
  })
  Model.find = jest.fn((filter: AnyDoc = {}) =>
    createQuery(() => store.docs.filter((doc) => matchesFilter(doc, filter))),
  )
  Model.findOne = jest.fn((filter: AnyDoc = {}) =>
    createQuery(
      () => store.docs.find((doc) => matchesFilter(doc, filter)) ?? null,
    ),
  )
  Model.exists = jest.fn((filter: AnyDoc = {}) =>
    createQuery(() =>
      store.docs.some((doc) => matchesFilter(doc, filter))
        ? { _id: 'exists' }
        : null,
    ),
  )
  Model.countDocuments = jest.fn((filter: AnyDoc = {}) =>
    createQuery(
      () => store.docs.filter((doc) => matchesFilter(doc, filter)).length,
    ),
  )
  Model.updateOne = jest.fn((filter: AnyDoc = {}, update: AnyDoc = {}) =>
    createQuery(() => {
      const doc = store.docs.find((item) => matchesFilter(item, filter))
      if (!doc) {
        return { matchedCount: 0, modifiedCount: 0 }
      }
      const error = store.failUpdateWhen?.(filter, update, doc)
      if (error) {
        throw error
      }
      applyUpdate(doc, update)
      return { matchedCount: 1, modifiedCount: 1 }
    }),
  )
  Model.replaceOne = jest.fn((filter: AnyDoc = {}, replacement: AnyDoc = {}) =>
    createQuery(() => {
      const index = store.docs.findIndex((doc) => matchesFilter(doc, filter))
      if (index < 0) {
        return { modifiedCount: 0 }
      }
      if (
        replacement._id !== undefined &&
        store.docs[index]._id !== undefined &&
        replacement._id !== store.docs[index]._id
      ) {
        throw new Error(
          "Performing an update on the path '_id' would modify the immutable field '_id'",
        )
      }
      store.docs[index] = attachDocument(
        deepClone(stripDocument(replacement)),
        store,
        identity,
      )
      return { modifiedCount: 1 }
    }),
  )
  Model.deleteOne = jest.fn((filter: AnyDoc = {}) =>
    createQuery(() => {
      const index = store.docs.findIndex((doc) => matchesFilter(doc, filter))
      if (index < 0) {
        return { deletedCount: 0 }
      }
      store.docs.splice(index, 1)
      return { deletedCount: 1 }
    }),
  )
  Model.deleteMany = jest.fn((filter: AnyDoc = {}) =>
    createQuery(() => {
      let deletedCount = 0
      for (let index = store.docs.length - 1; index >= 0; index -= 1) {
        if (matchesFilter(store.docs[index], filter)) {
          store.docs.splice(index, 1)
          deletedCount += 1
        }
      }
      return { deletedCount }
    }),
  )

  store.Model = Model
  store.docs.push(
    ...seed.map((doc) =>
      attachDocument(
        { _id: `mock-id-${nextObjectId++}`, ...deepClone(doc) },
        store,
        identity,
      ),
    ),
  )
  return store
}

function attachDocument(
  doc: AnyDoc,
  store: FakeModelStore,
  identity: Identity,
) {
  doc.save = jest.fn(async () => {
    const error = store.failNextSave ?? store.failSaveWhen?.(doc)
    store.failNextSave = undefined
    if (error) {
      throw error
    }
    const index = store.docs.findIndex(
      (item) => identity(item) === identity(doc),
    )
    if (index >= 0) {
      store.docs[index] = doc
    } else {
      store.docs.push(doc)
    }
    return doc
  })
  doc.toObject = () => stripDocument(doc)
  return doc
}

function createQuery(executor: () => any) {
  let sortSpec: AnyDoc | undefined
  let skipCount = 0
  let limitCount: number | undefined

  const query: AnyDoc = {
    session: jest.fn(() => query),
    select: jest.fn(() => query),
    sort: jest.fn((spec: AnyDoc) => {
      sortSpec = spec
      return query
    }),
    skip: jest.fn((count: number) => {
      skipCount = count
      return query
    }),
    limit: jest.fn((count: number) => {
      limitCount = count
      return query
    }),
    exec: jest.fn(async () => {
      const value = executor()
      if (!Array.isArray(value)) {
        return value
      }
      let result = [...value]
      if (sortSpec) {
        result.sort((left, right) => compareBySortSpec(left, right, sortSpec!))
      }
      if (skipCount) {
        result = result.slice(skipCount)
      }
      if (limitCount !== undefined) {
        result = result.slice(0, limitCount)
      }
      return result
    }),
  }
  query.then = (resolve: any, reject: any) => query.exec().then(resolve, reject)
  query.catch = (reject: any) => query.exec().catch(reject)
  return query
}

function compareBySortSpec(left: AnyDoc, right: AnyDoc, sortSpec: AnyDoc) {
  for (const [field, direction] of Object.entries(sortSpec)) {
    const leftValue = valueAt(left, field) as string | number
    const rightValue = valueAt(right, field) as string | number
    if (leftValue === rightValue) {
      continue
    }
    const order = leftValue > rightValue ? 1 : -1
    return Number(direction) < 0 ? -order : order
  }
  return 0
}

function matchesFilter(doc: AnyDoc, filter: AnyDoc): boolean {
  return Object.entries(filter ?? {}).every(([key, condition]) => {
    if (key === '$and') {
      return (condition as AnyDoc[]).every((item) => matchesFilter(doc, item))
    }
    if (key === '$or') {
      return (condition as AnyDoc[]).some((item) => matchesFilter(doc, item))
    }
    return matchesCondition(valueAt(doc, key), condition)
  })
}

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition instanceof RegExp) {
    return typeof value === 'string' && condition.test(value)
  }
  if (isPlainObject(condition)) {
    if ('$in' in condition) {
      const values = condition.$in as unknown[]
      return Array.isArray(value)
        ? value.some((item) => values.includes(item))
        : values.includes(value)
    }
    if ('$ne' in condition) {
      return Array.isArray(value)
        ? !value.includes(condition.$ne)
        : value !== condition.$ne
    }
  }
  return Array.isArray(value) ? value.includes(condition) : value === condition
}

function applyUpdate(doc: AnyDoc, update: AnyDoc) {
  if (update.$set) {
    Object.assign(doc, update.$set)
  } else {
    Object.assign(doc, update)
  }
  if (update.$unset) {
    for (const field of Object.keys(update.$unset)) {
      delete doc[field]
    }
  }
}

function valueAt(doc: AnyDoc, path: string): unknown {
  return path.split('.').reduce((value: any, key) => value?.[key], doc)
}

function isPlainObject(value: unknown): value is AnyDoc {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function groupDoc(overrides: Partial<AnyDoc> = {}) {
  return {
    code: 'AB12',
    ownerUserId: 'u1',
    name: 'Trip',
    archivedUserIds: [],
    isDeleted: false,
    createdAtMs: 100,
    modifiedAt: 100,
    ...overrides,
  }
}

function userParticipant(groupCode: string, userId: string) {
  return {
    groupCode,
    participantId: userId,
    kind: 'user',
    userId,
    createdAtMs: 100,
    modifiedAt: 100,
  }
}

function tempParticipant(
  groupCode: string,
  participantId: string,
  tempName: string,
) {
  return {
    groupCode,
    participantId,
    kind: 'tempUser',
    tempName,
    createdAtMs: 100,
    modifiedAt: 100,
  }
}

function projection(
  groupCode: string,
  participantId: string,
  overrides: Partial<AnyDoc> = {},
) {
  const kind =
    overrides.kind ??
    (participantId.startsWith('tmp') || participantId.startsWith('p')
      ? 'tempUser'
      : 'user')
  return {
    groupCode,
    participantId,
    kind,
    userId: kind === 'user' ? participantId : undefined,
    balanceValue: '0',
    expenseShareValue: '0',
    paidTotalValue: '0',
    recordCount: 0,
    settlementInValue: '0',
    settlementOutValue: '0',
    modifiedAt: 100,
    ...overrides,
  }
}

function expenseRecord(overrides: Partial<AnyDoc>) {
  return {
    groupCode: 'AB12',
    recordId: 'r1',
    type: 'expense',
    amountValue: '100',
    payerId: 'u1',
    participantIds: ['u1'],
    involvedParticipantIds: ['u1'],
    category: 'food',
    note: '',
    createdAt: 100,
    updatedAt: 100,
    createdBy: 'u1',
    ...overrides,
  }
}

function settlementRecord(overrides: Partial<AnyDoc>) {
  return {
    groupCode: 'AB12',
    recordId: 'r2',
    type: 'settlement',
    amountValue: '100',
    fromId: 'u2',
    toId: 'u1',
    involvedParticipantIds: ['u2', 'u1'],
    category: 'settlement',
    note: '',
    createdAt: 100,
    updatedAt: 100,
    createdBy: 'u1',
    ...overrides,
  }
}

function structuredSearch(query: string, fields = ['note', 'categoryName']) {
  return JSON.stringify({
    operator: 'or',
    conditions: fields.map((field) => ({ field, query })),
  })
}

function expectProjection(
  ctx: TestContext,
  participantId: string,
  expected: AnyDoc,
) {
  expect(projectionDoc(ctx, participantId)).toEqual(
    expect.objectContaining(expected),
  )
}

function projectionDoc(ctx: TestContext, participantId: string) {
  const projection = ctx.projectionStore.docs.find(
    (doc) => doc.groupCode === 'AB12' && doc.participantId === participantId,
  )
  if (!projection) {
    throw new Error(`missing projection ${participantId}`)
  }
  return projection
}

function expectBalanceSumZero(ctx: TestContext, groupCode = 'AB12') {
  expect(
    ctx.projectionStore.docs
      .filter((doc) => doc.groupCode === groupCode)
      .reduce((sum, doc) => sum + BigInt(doc.balanceValue), 0n),
  ).toBe(0n)
}

async function expectRebuildMatches(ctx: TestContext, groupCode = 'AB12') {
  const before = projectionSnapshot(ctx, groupCode)
  await ctx.service.rebuildProjectionsForGroup(groupCode)
  expect(projectionSnapshot(ctx, groupCode)).toEqual(before)
}

function projectionSnapshot(ctx: TestContext, groupCode = 'AB12') {
  return ctx.projectionStore.docs
    .filter((doc) => doc.groupCode === groupCode)
    .map((doc) => ({
      groupCode: doc.groupCode,
      participantId: doc.participantId,
      kind: doc.kind,
      userId: doc.userId,
      balanceValue: doc.balanceValue,
      expenseShareValue: doc.expenseShareValue,
      paidTotalValue: doc.paidTotalValue,
      recordCount: doc.recordCount,
      settlementInValue: doc.settlementInValue,
      settlementOutValue: doc.settlementOutValue,
    }))
    .sort((left, right) =>
      left.participantId.localeCompare(right.participantId),
    )
}

function seededZeroSnapshot() {
  return [
    {
      groupCode: 'AB12',
      participantId: 'tmp1',
      kind: 'tempUser',
      userId: undefined,
      ...zeroProjectionValues,
    },
    {
      groupCode: 'AB12',
      participantId: 'u1',
      kind: 'user',
      userId: 'u1',
      ...zeroProjectionValues,
    },
    {
      groupCode: 'AB12',
      participantId: 'u2',
      kind: 'user',
      userId: 'u2',
      ...zeroProjectionValues,
    },
  ]
}

function ledgerSnapshot(ctx: TestContext) {
  return JSON.stringify({
    groups: ctx.groupStore.docs.map(stripDocument),
    participants: ctx.participantStore.docs.map(stripDocument),
    records: ctx.recordStore.docs.map(stripDocument),
    projections: ctx.projectionStore.docs.map(stripDocument),
  })
}

function stripDocument(doc: AnyDoc) {
  return Object.fromEntries(
    Object.entries(doc).filter(([, value]) => typeof value !== 'function'),
  )
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
