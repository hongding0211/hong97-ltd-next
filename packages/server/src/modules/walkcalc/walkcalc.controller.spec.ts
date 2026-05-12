import { ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AddWalkcalcRecordDto } from './dto/record.dto'
import { WalkcalcController } from './walkcalc.controller'
import { WalkcalcService } from './walkcalc.service'

describe('WalkcalcController', () => {
  let controller: WalkcalcController
  let service: jest.Mocked<WalkcalcService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalkcalcController],
      providers: [
        {
          provide: WalkcalcService,
          useValue: {
            currentUser: jest.fn(),
            users: jest.fn(),
            searchUsers: jest.fn(),
            homeSummary: jest.fn(),
            createGroup: jest.fn(),
            joinGroup: jest.fn(),
            myGroups: jest.fn(),
            getGroup: jest.fn(),
            dismissGroup: jest.fn(),
            addTempUser: jest.fn(),
            inviteUsers: jest.fn(),
            archiveGroup: jest.fn(),
            renameGroup: jest.fn(),
            addRecord: jest.fn(),
            dropRecord: jest.fn(),
            updateRecord: jest.fn(),
            groupRecords: jest.fn(),
            groupBalances: jest.fn(),
            participantBalanceDetail: jest.fn(),
            settlementSuggestion: jest.fn(),
            resolveSettlements: jest.fn(),
            getRecord: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(WalkcalcController)
    service = module.get(WalkcalcService)
  })

  it('wires user helpers and home summary to the service', async () => {
    service.currentUser.mockResolvedValue({ userId: 'u1' } as any)
    service.users.mockResolvedValue([{ userId: 'u2' }] as any)
    service.searchUsers.mockResolvedValue([{ userId: 'u3' }] as any)
    service.homeSummary.mockResolvedValue({ totalBalance: '12.34' })

    await controller.currentUser('u1')
    await controller.users({ userIds: ['u2'] })
    await controller.searchUsers({ name: 'Hong' })
    await controller.homeSummary('u1')

    expect(service.currentUser).toHaveBeenCalledWith('u1')
    expect(service.users).toHaveBeenCalledWith(['u2'])
    expect(service.searchUsers).toHaveBeenCalledWith('Hong')
    expect(service.homeSummary).toHaveBeenCalledWith('u1')
  })

  it('wires group and balance routes to the service', async () => {
    service.createGroup.mockResolvedValue({ code: 'AB12' })
    service.joinGroup.mockResolvedValue({ code: 'AB12' })
    service.myGroups.mockResolvedValue({
      data: [
        {
          code: 'AB12',
          participantCount: 2,
          participantPreview: [
            {
              participantId: 'u1',
              kind: 'user',
              userId: 'u1',
              profile: { name: 'Hong' },
            },
          ],
        },
      ],
      total: 1,
    } as any)
    service.getGroup.mockResolvedValue({ code: 'AB12' } as any)
    service.addTempUser.mockResolvedValue({ participantId: 'tmp1' } as any)
    service.inviteUsers.mockResolvedValue({ code: 'AB12', userIds: ['u2'] })
    service.archiveGroup.mockResolvedValue({ code: 'AB12' })
    service.renameGroup.mockResolvedValue({ code: 'AB12', name: 'Next' })
    service.groupBalances.mockResolvedValue({
      groupCode: 'AB12',
      participants: [],
    })

    await controller.createGroup('u1', { name: 'Trip' })
    await controller.joinGroup('u1', { code: 'AB12' })
    await expect(
      controller.myGroups('u1', { page: 1, pageSize: 10 }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            participantCount: 2,
            participantPreview: [
              expect.objectContaining({ participantId: 'u1' }),
            ],
          }),
        ],
      }),
    )
    await controller.getGroup('u1', 'AB12')
    await controller.addTempUser('u1', 'AB12', { name: 'Guest' })
    await controller.inviteUsers('u1', 'AB12', { userIds: ['u2'] })
    await controller.archiveGroup('u1', 'AB12')
    await controller.unarchiveGroup('u1', 'AB12')
    await controller.renameGroup('u1', 'AB12', { name: 'Next' })
    await controller.groupBalances('u1', 'AB12')

    expect(service.createGroup).toHaveBeenCalledWith('u1', { name: 'Trip' })
    expect(service.joinGroup).toHaveBeenCalledWith('u1', 'AB12')
    expect(service.myGroups).toHaveBeenCalledWith('u1', {
      page: 1,
      pageSize: 10,
    })
    expect(service.getGroup).toHaveBeenCalledWith('u1', 'AB12')
    expect(service.addTempUser).toHaveBeenCalledWith('u1', 'AB12', 'Guest')
    expect(service.inviteUsers).toHaveBeenCalledWith('u1', 'AB12', ['u2'])
    expect(service.archiveGroup).toHaveBeenCalledWith('u1', 'AB12', true)
    expect(service.archiveGroup).toHaveBeenCalledWith('u1', 'AB12', false)
    expect(service.renameGroup).toHaveBeenCalledWith('u1', 'AB12', 'Next')
    expect(service.groupBalances).toHaveBeenCalledWith('u1', 'AB12')
  })

  it('passes archive state filters through the my groups route', async () => {
    service.myGroups.mockResolvedValue({
      data: [{ code: 'CD34', archivedUserIds: ['u1'] }],
      total: 1,
      page: 2,
      pageSize: 5,
    } as any)

    await controller.myGroups('u1', {
      page: 2,
      pageSize: 5,
      archiveState: 'archived',
    })

    expect(service.myGroups).toHaveBeenCalledWith('u1', {
      page: 2,
      pageSize: 5,
      archiveState: 'archived',
    })
  })

  it('wires semantic record and settlement routes to the service', async () => {
    const expense = {
      groupCode: 'AB12',
      type: 'expense' as const,
      amount: '100.00',
      payerId: 'u1',
      participantIds: ['u1', 'u2'],
      category: 'food',
      note: 'Dinner',
      occurredAt: 1710000000000,
    }
    const update = { ...expense, recordId: 'record-1', amount: '120.00' }
    service.addRecord.mockResolvedValue({
      record: { recordId: 'record-1' },
    } as any)
    service.updateRecord.mockResolvedValue({
      record: { recordId: 'record-1' },
    } as any)
    service.dropRecord.mockResolvedValue({
      groupCode: 'AB12',
      recordId: 'record-1',
    } as any)
    service.groupRecords.mockResolvedValue({ data: [], total: 0 } as any)
    service.participantBalanceDetail.mockResolvedValue({ records: [] } as any)
    service.settlementSuggestion.mockResolvedValue({
      groupCode: 'AB12',
      strategy: 'exact',
      transfers: [],
    })
    service.resolveSettlements.mockResolvedValue({ records: [] } as any)
    service.getRecord.mockResolvedValue({ recordId: 'record-1' } as any)

    await controller.addRecord('u1', expense)
    await controller.updateRecord('u1', update)
    await controller.dropRecord('u1', {
      groupCode: 'AB12',
      recordId: 'record-1',
    })
    await controller.groupRecords('u1', 'AB12', { page: 1, pageSize: 10 })
    await controller.participantRecords('u1', 'AB12', 'u2', {
      page: 1,
      pageSize: 10,
    })
    await controller.settlementSuggestion('u1', 'AB12')
    await controller.resolveSettlements('u1', 'AB12', {})
    await controller.getRecord('u1', 'record-1')

    expect(service.addRecord).toHaveBeenCalledWith('u1', expense)
    expect(service.updateRecord).toHaveBeenCalledWith('u1', update)
    expect(service.dropRecord).toHaveBeenCalledWith('u1', 'AB12', 'record-1')
    expect(service.groupRecords).toHaveBeenCalledWith('u1', 'AB12', {
      page: 1,
      pageSize: 10,
    })
    expect(service.participantBalanceDetail).toHaveBeenCalledWith(
      'u1',
      'AB12',
      'u2',
      { page: 1, pageSize: 10 },
    )
    expect(service.settlementSuggestion).toHaveBeenCalledWith('u1', 'AB12')
    expect(service.resolveSettlements).toHaveBeenCalledWith('u1', 'AB12', {})
    expect(service.getRecord).toHaveBeenCalledWith('u1', 'record-1')
  })

  it('uses the new semantic record contract and rejects legacy money fields through validation', async () => {
    const validationPipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })

    await expect(
      validationPipe.transform(
        {
          groupCode: 'AB12',
          type: 'expense',
          amount: '12.34',
          payerId: 'u1',
          participantIds: ['u1', 'u2'],
          occurredAt: 1710000000000,
          paidMinor: '1234',
        },
        { type: 'body', metatype: AddWalkcalcRecordDto } as any,
      ),
    ).rejects.toThrow()

    await expect(
      validationPipe.transform(
        {
          groupCode: 'AB12',
          type: 'expense',
          amount: '-12.34',
          payerId: 'u1',
          participantIds: ['u1', 'u2'],
          occurredAt: 1710000000000,
        },
        { type: 'body', metatype: AddWalkcalcRecordDto } as any,
      ),
    ).rejects.toThrow()

    await expect(
      validationPipe.transform(
        {
          groupCode: 'AB12',
          type: 'expense',
          amount: '12.34',
          payerId: 'u1',
          participantIds: ['u1', 'u2'],
          occurredAt: 1710000000000,
        },
        { type: 'body', metatype: AddWalkcalcRecordDto } as any,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        amount: '12.34',
        payerId: 'u1',
        participantIds: ['u1', 'u2'],
        occurredAt: 1710000000000,
      }),
    )
  })
})
