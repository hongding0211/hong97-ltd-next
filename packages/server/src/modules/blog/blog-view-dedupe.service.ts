import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { type RedisClientType, createClient } from 'redis'

const CLAIM_VIEW_SCRIPT = `
local wasSeen = 0

for _, key in ipairs(KEYS) do
  if redis.call('EXISTS', key) == 1 then
    wasSeen = 1
  end
end

for _, key in ipairs(KEYS) do
  redis.call('SET', key, '1', 'PX', ARGV[1])
end

if wasSeen == 1 then
  return 0
end

return 1
`

const MAX_FALLBACK_KEYS = 50_000
const COOKIE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const BLOG_VIEW_REDIS_CLIENT_FACTORY = Symbol(
  'BLOG_VIEW_REDIS_CLIENT_FACTORY',
)

export type BlogViewRedisClientFactory = (url: string) => RedisClientType

export type BlogViewerIdentity = {
  aliases: string[]
  visitorIdHash: string
}

export const createBlogViewRedisClient: BlogViewRedisClientFactory = (url) =>
  createClient({ url }) as RedisClientType

@Injectable()
export class BlogViewDedupeService implements OnApplicationShutdown {
  private readonly logger = new Logger(BlogViewDedupeService.name)
  private readonly ttlMs: number
  private readonly cookieName: string
  private readonly cookieMaxAgeMs: number
  private readonly identitySecret: string
  private readonly client?: RedisClientType
  private connectPromise?: Promise<RedisClientType>
  private redisWarningLogged = false
  private readonly fallbackExpirations = new Map<string, number>()

  constructor(
    private readonly configService: ConfigService,
    @Inject(BLOG_VIEW_REDIS_CLIENT_FACTORY)
    clientFactory: BlogViewRedisClientFactory,
  ) {
    this.ttlMs = configService.get<number>('blog.viewDedupTtlMs') ?? 600_000
    this.cookieName =
      configService.get<string>('blog.visitorCookieName') ?? 'blogVisitorId'
    this.cookieMaxAgeMs =
      configService.get<number>('blog.visitorCookieMaxAgeMs') ??
      365 * 24 * 60 * 60 * 1000
    this.identitySecret =
      configService.get<string>('blog.identitySecret') ??
      'local-blog-view-identity-secret'

    const redisUrl = configService.get<string>('rateLimit.redisUrl')
    if (redisUrl) {
      this.client = clientFactory(redisUrl)
      this.client.on('error', (error) => {
        if (!this.redisWarningLogged) {
          this.logger.warn(`Blog view Redis error: ${error.message}`)
          this.redisWarningLogged = true
        }
      })
    }
  }

  resolveViewerIdentity(
    request: Request,
    response: Response,
    userId?: string,
  ): BlogViewerIdentity {
    const cookieValue = request.cookies?.[this.cookieName]
    const existingVisitorToken = this.verifyVisitorCookie(cookieValue)
    const visitorToken = existingVisitorToken ?? randomUUID()

    if (!existingVisitorToken) {
      response.cookie(
        this.cookieName,
        this.signVisitorCookie(visitorToken),
        this.getCookieOptions(),
      )
    }

    const aliases = [`visitor:${visitorToken}`]
    if (userId) {
      aliases.push(`user:${userId}`)
    }
    if (!existingVisitorToken) {
      aliases.push(
        `request:${request.ip || ''}:${request.get('user-agent') || ''}`,
      )
    }

    return {
      aliases,
      visitorIdHash: this.digest(`history:${visitorToken}`),
    }
  }

  async claim(blogId: string, aliases: string[]): Promise<boolean> {
    const keys = [...new Set(aliases)].map(
      (alias) =>
        `hong97:blog:view:{${this.digest(`blog:${blogId}`)}}:${this.digest(
          alias,
        )}`,
    )

    if (!keys.length) {
      return false
    }

    if (this.client) {
      try {
        await this.connect()
        const result = await this.client.eval(CLAIM_VIEW_SCRIPT, {
          keys,
          arguments: [String(this.ttlMs)],
        })
        this.redisWarningLogged = false
        return Number(result) === 1
      } catch (error) {
        if (!this.redisWarningLogged) {
          this.logger.warn(
            `Using in-memory blog view deduplication because Redis is unavailable: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
          this.redisWarningLogged = true
        }
      }
    }

    return this.claimInMemory(keys)
  }

  async onApplicationShutdown() {
    if (this.client?.isOpen) {
      await this.client.quit()
    }
  }

  private connect(): Promise<RedisClientType> {
    if (!this.client) {
      throw new Error('Redis client is not configured')
    }
    if (this.client.isOpen) {
      return Promise.resolve(this.client)
    }
    this.connectPromise ??= this.client.connect().catch((error) => {
      this.connectPromise = undefined
      throw error
    })
    return this.connectPromise
  }

  private claimInMemory(keys: string[]) {
    const now = Date.now()
    const wasSeen = keys.some(
      (key) => (this.fallbackExpirations.get(key) ?? 0) > now,
    )
    const expiresAt = now + this.ttlMs

    for (const key of keys) {
      this.fallbackExpirations.delete(key)
      this.fallbackExpirations.set(key, expiresAt)
    }
    this.trimFallback(now)

    return !wasSeen
  }

  private trimFallback(now: number) {
    if (this.fallbackExpirations.size <= MAX_FALLBACK_KEYS) {
      return
    }
    for (const [key, expiresAt] of this.fallbackExpirations) {
      if (
        expiresAt <= now ||
        this.fallbackExpirations.size > MAX_FALLBACK_KEYS
      ) {
        this.fallbackExpirations.delete(key)
      }
      if (this.fallbackExpirations.size <= MAX_FALLBACK_KEYS) {
        break
      }
    }
  }

  private getCookieOptions() {
    const sameSite =
      this.configService.get<'strict' | 'lax' | 'none'>(
        'auth.cookies.sameSite',
      ) ?? 'strict'

    return {
      httpOnly: true,
      secure:
        this.configService.get<boolean>('auth.cookies.secure') ??
        process.env.NODE_ENV === 'production',
      sameSite,
      maxAge: this.cookieMaxAgeMs,
      path: '/',
    } as const
  }

  private signVisitorCookie(visitorToken: string) {
    return `${visitorToken}.${this.digest(`cookie:${visitorToken}`)}`
  }

  private verifyVisitorCookie(value: unknown) {
    if (typeof value !== 'string') {
      return undefined
    }
    const separator = value.lastIndexOf('.')
    if (separator <= 0) {
      return undefined
    }
    const visitorToken = value.slice(0, separator)
    const signature = value.slice(separator + 1)
    if (!COOKIE_TOKEN_PATTERN.test(visitorToken)) {
      return undefined
    }
    const expected = this.digest(`cookie:${visitorToken}`)
    const receivedBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return undefined
    }
    return visitorToken
  }

  private digest(value: string) {
    return createHmac('sha256', this.identitySecret).update(value).digest('hex')
  }
}
