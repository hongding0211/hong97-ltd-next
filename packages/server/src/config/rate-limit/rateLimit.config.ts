import { registerAs } from '@nestjs/config'

export default registerAs('rateLimit', () => ({
  ttl: process.env.RATE_LIMIT_TTL ? parseInt(process.env.RATE_LIMIT_TTL) : 60, // Time window in seconds
  limit: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 10, // Max requests per time window
}))
