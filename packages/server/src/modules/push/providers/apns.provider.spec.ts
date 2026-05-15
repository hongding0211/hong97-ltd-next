import { generateKeyPairSync } from 'crypto'
import {
  ApnsPushProvider,
  buildApnsPayload,
  createApnsProviderToken,
  mapApnsResponse,
} from './apns.provider'

function privateKey() {
  const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  return pair.privateKey
    .export({
      type: 'pkcs8',
      format: 'pem',
    })
    .toString()
}

describe('APNs provider helpers', () => {
  it('creates ES256 APNs provider tokens', () => {
    const token = createApnsProviderToken(
      {
        credentialRef: 'hong97',
        teamId: 'TEAMID1234',
        keyId: 'KEYID1234',
        privateKey: privateKey(),
      },
      1778688000,
    )

    expect(token.split('.')).toHaveLength(3)
    expect(
      JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()),
    ).toEqual({
      alg: 'ES256',
      kid: 'KEYID1234',
    })
  })

  it('maps neutral alert and silent messages to APNs payloads', () => {
    expect(
      buildApnsPayload({
        app: {} as any,
        type: 'comment.created',
        mode: 'alert',
        alert: { title: 'New comment', body: 'Hong commented' },
        badge: 2,
        sound: 'default',
        data: { postId: 'post-1' },
        apns: { category: 'COMMENT', threadId: 'post-1' },
      }),
    ).toEqual({
      postId: 'post-1',
      aps: {
        alert: { title: 'New comment', body: 'Hong commented' },
        badge: 2,
        sound: 'default',
        category: 'COMMENT',
        'thread-id': 'post-1',
      },
    })

    expect(
      buildApnsPayload({
        app: {} as any,
        type: 'sync.requested',
        mode: 'silent',
        data: { syncId: 'sync-1' },
      }),
    ).toEqual({
      syncId: 'sync-1',
      aps: {
        'content-available': 1,
      },
    })
  })

  it('normalizes APNs response codes', () => {
    expect(mapApnsResponse(200)).toBe('accepted')
    expect(mapApnsResponse(410, 'Unregistered')).toBe('invalid-token')
    expect(mapApnsResponse(400, 'BadDeviceToken')).toBe('invalid-token')
    expect(mapApnsResponse(403)).toBe('auth-error')
    expect(mapApnsResponse(429)).toBe('rate-limited')
    expect(mapApnsResponse(500)).toBe('provider-unavailable')
    expect(mapApnsResponse(400, 'BadCollapseId')).toBe('bad-request')
  })
})

describe('ApnsPushProvider', () => {
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

  it('sends APNs requests with app-scoped headers and normalized result', async () => {
    const httpClient = {
      post: jest.fn(async () => ({
        status: 200,
        headers: {},
      })),
    }
    const provider = new ApnsPushProvider(
      {
        get: jest.fn((key: string) =>
          key === 'push'
            ? {
                apps: [app],
                apnsCredentials: {
                  hong97: {
                    credentialRef: 'hong97',
                    teamId: 'TEAMID1234',
                    keyId: 'KEYID1234',
                    privateKey: privateKey(),
                  },
                },
              }
            : undefined,
        ),
      } as any,
      httpClient as any,
    )

    const result = await provider.send(
      {
        appId: 'hong97-ios',
        recipientId: 'user-1',
        deviceId: 'install-1',
        providerToken: 'token-1',
      } as any,
      {
        app,
        type: 'comment.created',
        mode: 'alert',
        alert: { title: 'New comment', body: 'Hong commented' },
        apns: { pushType: 'alert', priority: '10', collapseId: 'post-1' },
      },
    )

    expect(result).toMatchObject({
      code: 'accepted',
      appId: 'hong97-ios',
      recipientId: 'user-1',
      provider: 'apns',
      providerToken: 'token-1',
    })
    expect(httpClient.post).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'api.sandbox.push.apple.com',
        path: '/3/device/token-1',
        headers: expect.objectContaining({
          authorization: expect.stringMatching(/^bearer /),
          'apns-topic': 'com.example.hong97',
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'apns-collapse-id': 'post-1',
        }),
      }),
    )
  })

  it('maps provider invalid-token responses', async () => {
    const httpClient = {
      post: jest.fn(async () => ({
        status: 410,
        headers: {},
        body: { reason: 'Unregistered' },
      })),
    }
    const provider = new ApnsPushProvider(
      {
        get: jest.fn(() => ({
          apps: [app],
          apnsCredentials: {
            hong97: {
              credentialRef: 'hong97',
              teamId: 'TEAMID1234',
              keyId: 'KEYID1234',
              privateKey: privateKey(),
            },
          },
        })),
      } as any,
      httpClient as any,
    )

    await expect(
      provider.send(
        {
          appId: 'hong97-ios',
          recipientId: 'user-1',
          deviceId: 'install-1',
          providerToken: 'token-1',
        } as any,
        {
          app,
          type: 'comment.created',
          mode: 'alert',
          alert: { title: 'New comment', body: 'Hong commented' },
        },
      ),
    ).resolves.toMatchObject({
      code: 'invalid-token',
      providerReason: 'Unregistered',
    })
  })
})
