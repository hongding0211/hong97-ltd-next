import appConfig from './app/app.config'
import authConfig from './auth/auth.config'
import barkConfig from './bark/bark.config'
import databaseConfig from './database/database.config'
import ossConfig from './oss/oss.config'
import rateLimitConfig from './rate-limit/rateLimit.config'

export default {
  database: databaseConfig,
  auth: authConfig,
  app: appConfig,
  oss: ossConfig,
  rateLimit: rateLimitConfig,
  bark: barkConfig,
}
