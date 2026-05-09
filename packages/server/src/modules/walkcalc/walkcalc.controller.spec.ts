import { Test, TestingModule } from '@nestjs/testing'
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
            resolveDebts: jest.fn(),
            dropRecord: jest.fn(),
            updateRecord: jest.fn(),
            groupRecords: jest.fn(),
            getRecord: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(WalkcalcController)
    service = module.get(WalkcalcService)
  })

  it('creates groups through the Walkcalc service', async () => {
    service.createGroup.mockResolvedValue({ code: 'AB12' })

    await expect(
      controller.createGroup('u1', { name: 'Trip' }),
    ).resolves.toEqual({ code: 'AB12' })
    expect(service.createGroup).toHaveBeenCalledWith('u1', { name: 'Trip' })
  })

  it('dismisses groups through the soft-delete service operation', async () => {
    service.dismissGroup.mockResolvedValue({ code: 'AB12' })

    await expect(controller.dismissGroup('u1', 'AB12')).resolves.toEqual({
      code: 'AB12',
    })
    expect(service.dismissGroup).toHaveBeenCalledWith('u1', 'AB12')
  })

  it('keeps user lookup API methods wired to the service', async () => {
    service.currentUser.mockResolvedValue({ userId: 'u1' } as any)
    service.users.mockResolvedValue([{ userId: 'u2' }] as any)
    service.searchUsers.mockResolvedValue([{ userId: 'u3' }] as any)

    await controller.currentUser('u1')
    await controller.users({ userIds: ['u2'] })
    await controller.searchUsers({ name: 'Hong' })

    expect(service.currentUser).toHaveBeenCalledWith('u1')
    expect(service.users).toHaveBeenCalledWith(['u2'])
    expect(service.searchUsers).toHaveBeenCalledWith('Hong')
  })

  it('keeps existing group and record API methods wired to the service', async () => {
    service.joinGroup.mockResolvedValue({ code: 'AB12' })
    service.myGroups.mockResolvedValue({ data: [], total: 0 } as any)
    service.getGroup.mockResolvedValue({ code: 'AB12' } as any)
    service.addTempUser.mockResolvedValue({ uuid: 'tmp1' } as any)
    service.inviteUsers.mockResolvedValue({ code: 'AB12', userIds: ['u2'] })
    service.archiveGroup.mockResolvedValue({ code: 'AB12' })
    service.renameGroup.mockResolvedValue({ code: 'AB12', name: 'Next' })
    service.addRecord.mockResolvedValue({ recordId: 'record-1' } as any)
    service.resolveDebts.mockResolvedValue([{ recordId: 'record-2' }] as any)
    service.dropRecord.mockResolvedValue({
      groupCode: 'AB12',
      recordId: 'record-1',
    })
    service.updateRecord.mockResolvedValue({ recordId: 'record-1' } as any)
    service.groupRecords.mockResolvedValue({ data: [], total: 0 } as any)
    service.getRecord.mockResolvedValue({ recordId: 'record-1' } as any)

    await controller.joinGroup('u1', { code: 'AB12' })
    await controller.myGroups('u1', { page: 1, pageSize: 10 })
    await controller.getGroup('u1', 'AB12')
    await controller.addTempUser('u1', 'AB12', { name: 'Guest' })
    await controller.inviteUsers('u1', 'AB12', { userIds: ['u2'] })
    await controller.archiveGroup('u1', 'AB12')
    await controller.unarchiveGroup('u1', 'AB12')
    await controller.renameGroup('u1', 'AB12', { name: 'Next' })
    await controller.addRecord('u1', {
      groupCode: 'AB12',
      who: 'u1',
      paidMinor: '100',
      forWhom: ['u1'],
    })
    await controller.resolveDebts('u1', {
      groupCode: 'AB12',
      transfers: [{ from: 'u1', to: 'u2', amountMinor: '100' }],
    })
    await controller.dropRecord('u1', {
      groupCode: 'AB12',
      recordId: 'record-1',
    })
    await controller.updateRecord('u1', {
      groupCode: 'AB12',
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '100',
      forWhom: ['u1'],
    })
    await controller.groupRecords('u1', 'AB12', { page: 1, pageSize: 10 })
    await controller.getRecord('u1', 'record-1')

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
    expect(service.addRecord).toHaveBeenCalledWith('u1', {
      groupCode: 'AB12',
      who: 'u1',
      paidMinor: '100',
      forWhom: ['u1'],
    })
    expect(service.resolveDebts).toHaveBeenCalledWith('u1', {
      groupCode: 'AB12',
      transfers: [{ from: 'u1', to: 'u2', amountMinor: '100' }],
    })
    expect(service.dropRecord).toHaveBeenCalledWith('u1', 'AB12', 'record-1')
    expect(service.updateRecord).toHaveBeenCalledWith('u1', {
      groupCode: 'AB12',
      recordId: 'record-1',
      who: 'u1',
      paidMinor: '100',
      forWhom: ['u1'],
    })
    expect(service.groupRecords).toHaveBeenCalledWith('u1', 'AB12', {
      page: 1,
      pageSize: 10,
    })
    expect(service.getRecord).toHaveBeenCalledWith('u1', 'record-1')
  })
})
