import type { RedisClientType } from 'redis'
import { RedisThrottlerStorage } from './redis-throttler.storage'

function createClientMock() {
  const client = {
    isOpen: false,
    on: jest.fn(),
    connect: jest.fn(async () => {
      client.isOpen = true
      return client
    }),
    eval: jest.fn(),
    quit: jest.fn(async () => {
      client.isOpen = false
    }),
  }
  return client
}

describe('RedisThrottlerStorage', () => {
  it('increments throttle counters through Redis', async () => {
    const client = createClientMock()
    client.eval.mockResolvedValue([2, 60, 0, 0])
    const storage = new RedisThrottlerStorage(
      'redis://default:secret@127.0.0.1:6379/0',
      () => client as unknown as RedisClientType,
    )

    await expect(
      storage.increment('route:user', 60_000, 10, 60_000, 'default'),
    ).resolves.toEqual({
      totalHits: 2,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    })

    expect(client.connect).toHaveBeenCalledTimes(1)
    expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: [
        'hong97:throttle:hits:default:route:user',
        'hong97:throttle:block:default:route:user',
      ],
      arguments: ['60000', '10', '60000'],
    })
  })

  it('returns blocked state from Redis', async () => {
    const client = createClientMock()
    client.eval.mockResolvedValue([11, 60, 1, 30])
    const storage = new RedisThrottlerStorage(
      'redis://default:secret@127.0.0.1:6379/0',
      () => client as unknown as RedisClientType,
    )

    await expect(
      storage.increment('route:user', 60_000, 10, 30_000, 'default'),
    ).resolves.toEqual({
      totalHits: 11,
      timeToExpire: 60,
      isBlocked: true,
      timeToBlockExpire: 30,
    })
  })

  it('falls back to in-memory throttling when Redis is unavailable', async () => {
    const client = createClientMock()
    client.eval.mockRejectedValue(new Error('redis unavailable'))
    const storage = new RedisThrottlerStorage(
      'redis://default:secret@127.0.0.1:6379/0',
      () => client as unknown as RedisClientType,
    )

    const first = await storage.increment(
      'route:user',
      60_000,
      1,
      60_000,
      'default',
    )
    const second = await storage.increment(
      'route:user',
      60_000,
      1,
      60_000,
      'default',
    )
    await storage.onApplicationShutdown()

    expect(first).toMatchObject({ totalHits: 1, isBlocked: false })
    expect(second).toMatchObject({ totalHits: 2, isBlocked: true })
  })

  it('closes the Redis connection on shutdown', async () => {
    const client = createClientMock()
    client.eval.mockResolvedValue([1, 60, 0, 0])
    const storage = new RedisThrottlerStorage(
      'redis://default:secret@127.0.0.1:6379/0',
      () => client as unknown as RedisClientType,
    )

    await storage.increment('route:user', 60_000, 10, 60_000, 'default')
    await storage.onApplicationShutdown()

    expect(client.quit).toHaveBeenCalledTimes(1)
  })
})
