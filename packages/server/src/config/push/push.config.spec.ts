import { loadPushConfig } from './push.config'

describe('push config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.PUSH_APPS_JSON
    delete process.env.PUSH_APNS_HONG97_TEAM_ID
    delete process.env.PUSH_APNS_HONG97_KEY_ID
    delete process.env.PUSH_APNS_HONG97_PRIVATE_KEY
    delete process.env.PUSH_APNS_HONG97_PRIVATE_KEY_PATH
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('allows no configured push apps', () => {
    expect(loadPushConfig()).toEqual({
      apps: [],
      apnsCredentials: {},
    })
  })

  it('loads APNs app registrations and credential references from env', () => {
    process.env.PUSH_APPS_JSON = JSON.stringify([
      {
        appId: 'hong97-ios',
        platform: 'ios',
        provider: 'apns',
        topic: 'com.example.hong97',
        environment: 'sandbox',
        credentialRef: 'hong97',
        supportedLocales: ['en', 'cn'],
        defaultLocale: 'cn',
      },
    ])
    process.env.PUSH_APNS_HONG97_TEAM_ID = 'TEAMID1234'
    process.env.PUSH_APNS_HONG97_KEY_ID = 'KEYID1234'
    process.env.PUSH_APNS_HONG97_PRIVATE_KEY_PATH =
      '/run/secrets/fake-apns-key.p8'

    expect(loadPushConfig()).toEqual({
      apps: [
        {
          appId: 'hong97-ios',
          platform: 'ios',
          provider: 'apns',
          topic: 'com.example.hong97',
          environment: 'sandbox',
          credentialRef: 'hong97',
          supportedLocales: ['en', 'cn'],
          defaultLocale: 'cn',
        },
      ],
      apnsCredentials: {
        hong97: {
          credentialRef: 'hong97',
          teamId: 'TEAMID1234',
          keyId: 'KEYID1234',
          privateKeyPath: '/run/secrets/fake-apns-key.p8',
        },
      },
    })
  })

  it('rejects configured apps with missing required fields', () => {
    process.env.PUSH_APPS_JSON = JSON.stringify([
      {
        appId: 'hong97-ios',
        platform: 'ios',
        provider: 'apns',
        environment: 'sandbox',
        credentialRef: 'hong97',
        defaultLocale: 'cn',
      },
    ])

    expect(() => loadPushConfig()).toThrow(/topic or bundleId is required/)
  })

  it('rejects missing APNs secret material', () => {
    process.env.PUSH_APPS_JSON = JSON.stringify([
      {
        appId: 'hong97-ios',
        platform: 'ios',
        provider: 'apns',
        topic: 'com.example.hong97',
        environment: 'sandbox',
        credentialRef: 'hong97',
        defaultLocale: 'cn',
      },
    ])
    process.env.PUSH_APNS_HONG97_TEAM_ID = 'TEAMID1234'
    process.env.PUSH_APNS_HONG97_KEY_ID = 'KEYID1234'

    expect(() => loadPushConfig()).toThrow(/private key/)
  })
})
