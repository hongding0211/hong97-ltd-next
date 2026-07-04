import rateLimitConfig from './rateLimit.config'

describe('rateLimitConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.RATE_LIMIT_TTL
    delete process.env.RATE_LIMIT_MAX
    delete process.env.REDIS_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses a 60 second default TTL in milliseconds', () => {
    expect(rateLimitConfig()).toMatchObject({
      ttl: 60_000,
      limit: 10,
      redisUrl: undefined,
    })
  })

  it('reads rate limit and Redis settings from env', () => {
    process.env.RATE_LIMIT_TTL = '30'
    process.env.RATE_LIMIT_MAX = '25'
    process.env.REDIS_URL = 'redis://default:secret@127.0.0.1:6379/0'

    expect(rateLimitConfig()).toMatchObject({
      ttl: 30_000,
      limit: 25,
      redisUrl: 'redis://default:secret@127.0.0.1:6379/0',
    })
  })
})
