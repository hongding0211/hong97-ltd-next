import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import type { RedisClientType } from 'redis'
import { BlogViewDedupeService } from './blog-view-dedupe.service'

function createConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    'blog.viewDedupTtlMs': 600_000,
    'blog.visitorCookieName': 'blogVisitorId',
    'blog.visitorCookieMaxAgeMs': 31_536_000_000,
    'blog.identitySecret': 'test-secret',
    'auth.cookies.sameSite': 'strict',
    'auth.cookies.secure': false,
    ...overrides,
  }
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService
}

function createRedisClient() {
  const client = {
    isOpen: false,
    on: jest.fn(),
    connect: jest.fn(async () => {
      client.isOpen = true
      return client
    }),
    eval: jest.fn(),
    quit: jest.fn(),
  }
  return client
}

function createRequest(cookies: Record<string, string> = {}, ip = '127.0.0.1') {
  return {
    cookies,
    ip,
    get: jest.fn((name: string) =>
      name === 'user-agent' ? 'test-browser' : undefined,
    ),
  } as unknown as Request
}

function createResponse() {
  return { cookie: jest.fn() } as unknown as Response
}

describe('BlogViewDedupeService', () => {
  it('claims all viewer aliases atomically in Redis with a ten-minute TTL', async () => {
    const client = createRedisClient()
    client.eval.mockResolvedValue(1)
    const factory = jest.fn(() => client as unknown as RedisClientType)
    const service = new BlogViewDedupeService(
      createConfig({
        'rateLimit.redisUrl': 'redis://127.0.0.1:6379/0',
      }),
      factory,
    )

    await expect(
      service.claim('post-1', ['visitor:one', 'user:user-1']),
    ).resolves.toBe(true)

    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: [expect.any(String), expect.any(String)],
      arguments: ['600000'],
    })
    const { keys } = client.eval.mock.calls[0][1]
    expect(keys[0]).toMatch(/^hong97:blog:view:\{[a-f0-9]{64}\}:[a-f0-9]{64}$/)
    expect(keys[0].split(':').slice(0, 4)).toEqual(
      keys[1].split(':').slice(0, 4),
    )
  })

  it('uses a sliding in-memory fallback when Redis is not configured', async () => {
    const service = new BlogViewDedupeService(createConfig(), jest.fn())
    const now = jest.spyOn(Date, 'now')

    now.mockReturnValue(1_000_000)
    await expect(service.claim('post-1', ['visitor:one'])).resolves.toBe(true)

    now.mockReturnValue(1_599_999)
    await expect(service.claim('post-1', ['visitor:one'])).resolves.toBe(false)

    // The duplicate refreshed the ten-minute expiry.
    now.mockReturnValue(2_199_998)
    await expect(service.claim('post-1', ['visitor:one'])).resolves.toBe(false)

    now.mockReturnValue(2_799_999)
    await expect(service.claim('post-1', ['visitor:one'])).resolves.toBe(true)
    now.mockRestore()
  })

  it('links an anonymous visitor cookie to the user after login', async () => {
    const service = new BlogViewDedupeService(createConfig(), jest.fn())
    const firstResponse = createResponse()
    const anonymousIdentity = service.resolveViewerIdentity(
      createRequest(),
      firstResponse,
    )
    const cookieValue = (firstResponse.cookie as jest.Mock).mock.calls[0][1]

    await expect(
      service.claim('post-1', anonymousIdentity.aliases),
    ).resolves.toBe(true)

    const loggedInResponse = createResponse()
    const loggedInIdentity = service.resolveViewerIdentity(
      createRequest({ blogVisitorId: cookieValue }),
      loggedInResponse,
      'user-1',
    )

    expect(loggedInResponse.cookie).not.toHaveBeenCalled()
    expect(loggedInIdentity.aliases).toContain('user:user-1')
    expect(loggedInIdentity.visitorIdHash).toBe(anonymousIdentity.visitorIdHash)
    await expect(
      service.claim('post-1', loggedInIdentity.aliases),
    ).resolves.toBe(false)

    const otherDevice = service.resolveViewerIdentity(
      createRequest({}, '192.0.2.10'),
      createResponse(),
      'user-1',
    )
    await expect(service.claim('post-1', otherDevice.aliases)).resolves.toBe(
      false,
    )
  })
})
