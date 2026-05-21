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
          profile: {
            name:
              userId === 'u1'
                ? 'Hong'
                : userId === 'u2'
                  ? 'Alice'
                  : userId === 'u3'
                    ? 'Bob'
                    : userId,
          },
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
        titleEn: 'Trip',
        bodyEn: 'Alice paid ¥50.00 for you (Dinner)',
        titleCn: 'Trip',
        bodyCn: 'Alice 替你支付了 ¥50.00（Dinner）',
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
        titleEn: 'Trip',
        bodyEn: 'Alice paid ¥50.00 for you (Dinner)',
        titleCn: 'Trip',
        bodyCn: 'Alice 替你支付了 ¥50.00（Dinner）',
        recordId: 'record-1',
        affectedUserIds: ['u2'],
      },
    )

    expect(message).toMatchObject({
      mode: 'alert',
      alert: {
        title: 'Trip',
        body: 'Alice 替你支付了 ¥50.00（Dinner）',
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
          type: 'expense',
          amountValue: '10000',
          payerId: 'u1',
          participantIds: ['u2', 'temp-1'],
          involvedParticipantIds: ['u1', 'u2', 'temp-1'],
          note: 'Dinner',
        },
        {
          recordId: 'new-record',
          type: 'expense',
          amountValue: '9000',
          payerId: 'u2',
          participantIds: ['u2', 'u3', 'temp-1'],
          involvedParticipantIds: ['u2', 'u3', 'temp-1'],
          note: 'Taxi',
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

  it('builds recipient-specific visible copy for expense records', async () => {
    await service.notifyRecordCreated({
      actorUserId: 'u1',
      group,
      memberUserIds,
      records: [
        {
          recordId: 'record-1',
          type: 'expense',
          amountValue: '12000',
          payerId: 'u2',
          participantIds: ['u2', 'u3'],
          involvedParticipantIds: ['u2', 'u3'],
          note: 'Dinner',
        },
      ],
    })

    expect(pushService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'u2',
        payload: expect.objectContaining({
          titleCn: 'Trip',
          bodyCn: '你支付了 ¥120.00 给 Bob（Dinner）',
          titleEn: 'Trip',
          bodyEn: 'You paid ¥120.00 for Bob (Dinner)',
        }),
      }),
    )
    expect(pushService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'u3',
        payload: expect.objectContaining({
          titleCn: 'Trip',
          bodyCn: 'Alice 替你支付了 ¥60.00（Dinner）',
          titleEn: 'Trip',
          bodyEn: 'Alice paid ¥60.00 for you (Dinner)',
        }),
      }),
    )
  })

  it('builds recipient-specific visible copy for settlement records', async () => {
    await service.notifyRecordCreated({
      actorUserId: 'u1',
      group,
      memberUserIds,
      records: [
        {
          recordId: 'record-1',
          type: 'settlement',
          amountValue: '8000',
          fromId: 'u2',
          toId: 'u3',
          participantIds: [],
          involvedParticipantIds: ['u2', 'u3'],
        },
      ],
    })

    expect(pushService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'u2',
        payload: expect.objectContaining({
          titleCn: 'Trip',
          bodyCn: '你转给 Bob ¥80.00',
          titleEn: 'Trip',
          bodyEn: 'You transferred ¥80.00 to Bob',
        }),
      }),
    )
    expect(pushService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'u3',
        payload: expect.objectContaining({
          titleCn: 'Trip',
          bodyCn: 'Alice 转给你 ¥80.00',
          titleEn: 'Trip',
          bodyEn: 'Alice transferred ¥80.00 to you',
        }),
      }),
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
