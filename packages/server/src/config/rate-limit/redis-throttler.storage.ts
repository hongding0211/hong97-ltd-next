import { Logger, type OnApplicationShutdown } from '@nestjs/common'
import {
  type ThrottlerStorage,
  ThrottlerStorageService,
} from '@nestjs/throttler'
import { type RedisClientType, createClient } from 'redis'

const INCREMENT_SCRIPT = `
local hitsKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local function seconds(ms)
  if ms <= 0 then
    return 0
  end
  return math.ceil(ms / 1000)
end

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  local existingHits = tonumber(redis.call('GET', hitsKey) or '0')
  local hitsTtl = redis.call('PTTL', hitsKey)
  return { existingHits, seconds(hitsTtl), 1, seconds(blockTtl) }
end

local totalHits = redis.call('INCR', hitsKey)
local hitsTtl = redis.call('PTTL', hitsKey)
if totalHits == 1 or hitsTtl < 0 then
  redis.call('PEXPIRE', hitsKey, ttl)
  hitsTtl = ttl
end

if totalHits > limit then
  local effectiveBlockDuration = blockDuration
  if effectiveBlockDuration <= 0 then
    effectiveBlockDuration = ttl
  end
  redis.call('SET', blockKey, '1', 'PX', effectiveBlockDuration)
  redis.call('PEXPIRE', hitsKey, effectiveBlockDuration)
  return { totalHits, seconds(effectiveBlockDuration), 1, seconds(effectiveBlockDuration) }
end

return { totalHits, seconds(hitsTtl), 0, 0 }
`

export type RedisClientFactory = (url: string) => RedisClientType
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>

export class RedisThrottlerStorage
  implements ThrottlerStorage, OnApplicationShutdown
{
  private readonly logger = new Logger(RedisThrottlerStorage.name)
  private readonly fallbackStorage = new ThrottlerStorageService()
  private readonly client: RedisClientType
  private connectPromise?: Promise<RedisClientType>
  private fallbackWarningLogged = false

  constructor(
    private readonly redisUrl: string,
    clientFactory: RedisClientFactory = (url) =>
      createClient({ url }) as RedisClientType,
  ) {
    this.client = clientFactory(redisUrl)
    this.client.on('error', (error) => {
      this.logger.warn(`Redis throttler storage error: ${error.message}`)
    })
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      await this.connect()
      const result = await this.client.eval(INCREMENT_SCRIPT, {
        keys: [
          this.redisKey('hits', throttlerName, key),
          this.redisKey('block', throttlerName, key),
        ],
        arguments: [String(ttl), String(limit), String(blockDuration || ttl)],
      })
      const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] =
        this.parseResult(result)

      return {
        totalHits,
        timeToExpire,
        isBlocked: isBlocked === 1,
        timeToBlockExpire,
      }
    } catch (error) {
      if (!this.fallbackWarningLogged) {
        this.logger.warn(
          `Falling back to in-memory throttler storage because Redis is unavailable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
        this.fallbackWarningLogged = true
      }
      return this.fallbackStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      )
    }
  }

  async onApplicationShutdown() {
    this.fallbackStorage.onApplicationShutdown()
    if (this.client.isOpen) {
      await this.client.quit()
    }
  }

  private connect(): Promise<RedisClientType> {
    if (this.client.isOpen) {
      return Promise.resolve(this.client)
    }
    this.connectPromise ??= this.client.connect()
    return this.connectPromise
  }

  private redisKey(
    scope: 'hits' | 'block',
    throttlerName: string,
    key: string,
  ) {
    return `hong97:throttle:${scope}:${throttlerName}:${key}`
  }

  private parseResult(result: unknown): [number, number, number, number] {
    if (!Array.isArray(result) || result.length !== 4) {
      throw new Error('Unexpected Redis throttler response')
    }
    return result.map((value) => Number(value)) as [
      number,
      number,
      number,
      number,
    ]
  }
}
