import { PushNotificationCatalog } from './catalog'
import { PushController } from './push.controller'
import { PushModule } from './push.module'
import { PushService } from './push.service'

describe('PushService', () => {
  const app = {
    appId: 'hong97-ios',
    platform: 'ios' as const,
    provider: 'apns' as const,
    topic: 'com.example.hong97',
    environment: 'sandbox' as const,
    credentialRef: 'hong97',
    supportedLocales: ['en', 'cn'],
    defaultLocale: 'cn',
  }

  let devices: any[]
  let model: any
  let service: PushService
  let apnsProvider: any

  beforeEach(() => {
    devices = []
    model = {
      findOneAndUpdate: jest.fn((query, update) => ({
        exec: jest.fn(async () => {
          let device = devices.find(
            (item) =>
              item.appId === query.appId &&
              item.platform === query.platform &&
              item.providerToken === query.providerToken &&
              item.environment === query.environment,
          )
          if (!device) {
            device = {
              _id: `device-${devices.length + 1}`,
              ...update.$setOnInsert,
            }
            devices.push(device)
          }
          Object.assign(device, update.$set)
          return device
        }),
      })),
      find: jest.fn((query) => ({
        exec: jest.fn(async () =>
          devices.filter((device) =>
            Object.entries(query).every(
              ([key, value]) => device[key] === value,
            ),
          ),
        ),
      })),
      updateOne: jest.fn((query, update) => ({
        exec: jest.fn(async () => {
          const device = devices.find((item) =>
            Object.entries(query).every(([key, value]) => item[key] === value),
          )
          if (device) {
            Object.assign(device, update.$set)
          }
          return { modifiedCount: device ? 1 : 0 }
        }),
      })),
    }
    apnsProvider = {
      provider: 'apns',
      send: jest.fn(async (device) => ({
        code: 'accepted',
        appId: device.appId,
        recipientId: device.recipientId,
        deviceId: device.deviceId,
        provider: 'apns',
        providerToken: device.providerToken,
      })),
    }
    service = new PushService(
      model,
      {
        get: jest.fn((key: string) =>
          key === 'push' ? { apps: [app], apnsCredentials: {} } : undefined,
        ),
      } as any,
      new PushNotificationCatalog(),
      apnsProvider,
    )
  })

  it('upserts device registrations idempotently and normalizes locale', async () => {
    await service.upsertDeviceRegistration({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      platform: 'ios',
      providerToken: 'token-1',
      environment: 'sandbox',
      locale: 'en',
      deviceId: 'install-1',
    })
    await service.upsertDeviceRegistration({
      appId: 'hong97-ios',
      recipientId: 'user-2',
      platform: 'ios',
      providerToken: 'token-1',
      environment: 'sandbox',
      locale: 'fr',
      appVersion: '1.0.1',
    })

    expect(devices).toHaveLength(1)
    expect(devices[0]).toMatchObject({
      deviceId: 'install-1',
      recipientId: 'user-2',
      locale: 'cn',
      appVersion: '1.0.1',
      enabled: true,
    })
  })

  it('disables device registrations and excludes them from sends', async () => {
    await service.upsertDeviceRegistration({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      platform: 'ios',
      providerToken: 'token-1',
      environment: 'sandbox',
      locale: 'en',
    })
    await service.disableDeviceRegistration({
      appId: 'hong97-ios',
      providerToken: 'token-1',
      environment: 'sandbox',
      reason: 'Unregistered',
    })

    const result = await service.sendNotification({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      type: 'comment.created',
      payload: {
        actorName: 'Hong',
        postId: 'post-1',
        commentId: 'comment-1',
      },
    })

    expect(devices[0].enabled).toBe(false)
    expect(result.results).toEqual([
      {
        code: 'no-destination',
        appId: 'hong97-ios',
        recipientId: 'user-1',
      },
    ])
    expect(apnsProvider.send).not.toHaveBeenCalled()
  })

  it('disables a device by current recipient and device id', async () => {
    await service.upsertDeviceRegistration({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      platform: 'ios',
      providerToken: 'token-1',
      environment: 'sandbox',
      locale: 'en',
      deviceId: 'install-1',
    })

    await service.disableDeviceForRecipient({
      recipientId: 'user-1',
      deviceId: 'install-1',
      reason: 'client-disabled',
    })

    expect(devices[0]).toMatchObject({
      enabled: false,
      failureReason: 'client-disabled',
    })
  })

  it('renders localized messages and returns per-destination results', async () => {
    await service.upsertDeviceRegistration({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      platform: 'ios',
      providerToken: 'token-1',
      environment: 'sandbox',
      locale: 'en',
      deviceId: 'install-1',
    })
    await service.upsertDeviceRegistration({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      platform: 'ios',
      providerToken: 'token-2',
      environment: 'sandbox',
      locale: 'cn',
      deviceId: 'install-2',
    })
    apnsProvider.send.mockImplementationOnce(
      async (device: any, message: any) => {
        expect(message.alert).toEqual({
          title: 'New comment',
          body: 'Hong commented on your post',
        })
        expect(message.data).toEqual({
          postId: 'post-1',
          commentId: 'comment-1',
        })
        return {
          code: 'accepted',
          appId: device.appId,
          recipientId: device.recipientId,
          deviceId: device.deviceId,
          provider: 'apns',
          providerToken: device.providerToken,
        }
      },
    )
    apnsProvider.send.mockImplementationOnce(async (device: any) => ({
      code: 'invalid-token',
      appId: device.appId,
      recipientId: device.recipientId,
      deviceId: device.deviceId,
      provider: 'apns',
      providerToken: device.providerToken,
      providerReason: 'Unregistered',
    }))

    const result = await service.sendNotification({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      type: 'comment.created',
      payload: {
        actorName: 'Hong',
        postId: 'post-1',
        commentId: 'comment-1',
      },
    })

    expect(result.results).toHaveLength(2)
    expect(result.results.map((item) => item.code)).toEqual([
      'accepted',
      'invalid-token',
    ])
    expect(devices[1].enabled).toBe(false)
  })

  it('rejects unknown types and missing payload fields before provider calls', async () => {
    await expect(
      service.sendNotification({
        appId: 'hong97-ios',
        recipientId: 'user-1',
        type: 'missing.type',
        payload: {},
      }),
    ).rejects.toThrow(/Unknown push notification type/)

    await expect(
      service.sendNotification({
        appId: 'hong97-ios',
        recipientId: 'user-1',
        type: 'comment.created',
        payload: { actorName: 'Hong' },
      }),
    ).rejects.toThrow(/Missing push payload fields/)

    expect(apnsProvider.send).not.toHaveBeenCalled()
  })

  it('renders APNs client-localized payload keys', async () => {
    await service.upsertDeviceRegistration({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      platform: 'ios',
      providerToken: 'token-1',
      environment: 'sandbox',
      locale: 'en',
    })
    apnsProvider.send.mockImplementationOnce(
      async (device: any, message: any) => {
        expect(message.alert).toEqual({
          'title-loc-key': 'PUSH_SYSTEM_ANNOUNCEMENT_TITLE',
          'title-loc-args': undefined,
          'loc-key': 'PUSH_SYSTEM_ANNOUNCEMENT_BODY',
          'loc-args': ['announcement-1'],
        })
        return {
          code: 'accepted',
          appId: device.appId,
          recipientId: device.recipientId,
          providerToken: device.providerToken,
        }
      },
    )

    await service.sendNotification({
      appId: 'hong97-ios',
      recipientId: 'user-1',
      type: 'system.announcement',
      payload: { announcementId: 'announcement-1' },
    })
  })
})

describe('PushModule', () => {
  it('exports PushService and registers only the device registration controller', () => {
    const metadata = Reflect.getMetadata('controllers', PushModule)
    const exportsMetadata = Reflect.getMetadata('exports', PushModule)

    expect(metadata || []).toEqual([PushController])
    expect(exportsMetadata).toContain(PushService)
  })
})

describe('PushController', () => {
  it('registers devices with the authenticated user as recipient id', async () => {
    const service = {
      upsertDeviceRegistration: jest.fn(async (input) => ({
        ...input,
        provider: 'apns',
        enabled: true,
        lastRegisteredAt: new Date('2026-05-15T00:00:00.000Z'),
      })),
    }
    const controller = new PushController(service as any)

    await expect(
      controller.registerDevice('user-1', {
        appId: 'hong97-ios',
        platform: 'ios',
        providerToken: 'token-1',
        environment: 'sandbox',
        locale: 'cn',
        deviceId: 'install-1',
      }),
    ).resolves.toMatchObject({
      recipientId: 'user-1',
      deviceId: 'install-1',
      appId: 'hong97-ios',
      platform: 'ios',
      provider: 'apns',
      environment: 'sandbox',
      locale: 'cn',
      enabled: true,
    })

    expect(service.upsertDeviceRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'user-1',
        providerToken: 'token-1',
      }),
    )
  })

  it('disables only a device owned by the authenticated user', async () => {
    const service = {
      disableDeviceForRecipient: jest.fn(async () => ({ modifiedCount: 1 })),
    }
    const controller = new PushController(service as any)

    await expect(
      controller.disableDevice('user-1', 'install-1'),
    ).resolves.toEqual({ success: true })

    expect(service.disableDeviceForRecipient).toHaveBeenCalledWith({
      recipientId: 'user-1',
      deviceId: 'install-1',
      reason: 'client-disabled',
    })
  })
})
