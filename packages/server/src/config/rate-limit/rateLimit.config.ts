import { registerAs } from '@nestjs/config'

function secondsToMilliseconds(value: string | undefined, fallback: number) {
  const seconds = value ? parseInt(value) : fallback
  return seconds * 1000
}

export default registerAs('rateLimit', () => ({
  ttl: secondsToMilliseconds(process.env.RATE_LIMIT_TTL, 60),
  limit: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 10, // Max requests per time window
  redisUrl: process.env.REDIS_URL,
}))
