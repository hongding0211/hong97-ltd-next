import { ConfigService } from '@nestjs/config'
import { PushNotificationCatalog } from '../push/catalog'
import { WalkcalcPushService } from './walkcalc-push.service'

describe('WalkcalcPushService', () => {
  const group = { code: 'AB12', name: 'Trip' }
  const memberUserIds = ['u1', 'u2', 'u3']
  let catalog: PushNotificationCatalog
  let pushService: { sendNotification: jest.Mock }
  let service: WalkcalcPushService

  beforeEach(() => {
    catalog = new PushNotificationCatalog()
    pushService = {
      sendNotification: jest.fn(async (input) => ({
        appId: input.appId,
        recipientId: input.recipientId,
        type: input.type,
        results: [
          {
            code: 'accepted',
            appId: input.appId,
            recipientId: input.recipientId,
          },
        ],
      })),
    }
    service = new WalkcalcPushService(
      pushService as any,
      {
        findUserById: jest.fn(async (userId: string) => ({
          userId,
          profile: { name: userId === 'u1' ? 'Hong' : userId },
        })),
      } as any,
      { get: jest.fn(() => 'walkcalc-ios') } as unknown as ConfigService,
      catalog,
    )
    service.onModuleInit()
  })

  it('registers walkcalc notification catalog entries outside PushModule', () => {
    const entry = catalog.get('walkcalc.record.created')
    expect(entry).toBeDefined()

    expect(() =>
      catalog.validatePayload(entry!, {
        groupCode: 'AB12',
        groupName: 'Trip',
        actorUserId: 'u1',
        actorName: 'Hong',
        updateKind: 'record-created',
      }),
    ).toThrow(/recordId, affectedUserIds/)

    const message = catalog.renderMessage(
      {
        appId: 'walkcalc-ios',
        platform: 'ios',
        provider: 'apns',
        topic: 'com.example.walkcalc',
        environment: 'sandbox',
        credentialRef: 'walkcalc',
        supportedLocales: ['en', 'cn'],
        defaultLocale: 'cn',
      },
      { locale: 'cn' } as any,
      entry!,
      {
        groupCode: 'AB12',
        groupName: 'Trip',
        actorUserId: 'u1',
        actorName: 'Hong',
        updateKind: 'record-created',
        recordId: 'record-1',
        affectedUserIds: ['u2'],
      },
    )

    expect(message).toMatchObject({
      mode: 'alert',
      alert: {
        title: '新账单',
        body: 'Hong 在 Trip 添加了一笔账单',
      },
      data: {
        groupCode: 'AB12',
        recordId: 'record-1',
        affectedUserIds: ['u2'],
      },
      apns: {
        pushType: 'alert',
        priority: '10',
        threadId: 'AB12',
        collapseId: 'record-1',
      },
    })
  })

  it('deduplicates recipients and excludes temporary participants', async () => {
    await service.notifyRecordUpdated({
      actorUserId: 'u1',
      group,
      memberUserIds,
      records: [
        {
          recordId: 'old-record',
          payerId: 'u1',
          participantIds: ['u2', 'temp-1'],
          involvedParticipantIds: ['u1', 'u2', 'temp-1'],
        },
        {
          recordId: 'new-record',
          payerId: 'u2',
          participantIds: ['u2', 'u3', 'temp-1'],
          involvedParticipantIds: ['u2', 'u3', 'temp-1'],
        },
      ],
    })

    expect(pushService.sendNotification).toHaveBeenCalledTimes(3)
    expect(pushService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'walkcalc-ios',
        recipientId: 'u2',
        type: 'walkcalc.record.updated',
      }),
    )
    expect(pushService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'u3',
        type: 'walkcalc.record.updated',
      }),
    )
    expect(pushService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'u1',
        type: 'walkcalc.sync.requested',
      }),
    )
    expect(pushService.sendNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'temp-1' }),
    )
  })

  it('does not throw when push sending fails', async () => {
    pushService.sendNotification.mockRejectedValueOnce(new Error('APNs down'))

    await expect(
      service.notifyMemberJoined({
        actorUserId: 'u1',
        group,
        memberUserIds: ['u1', 'u2'],
      }),
    ).resolves.toBeUndefined()
  })
})
