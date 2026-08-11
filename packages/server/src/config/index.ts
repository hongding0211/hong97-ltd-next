import appConfig from './app/app.config'
import authConfig from './auth/auth.config'
import barkConfig from './bark/bark.config'
import blogConfig from './blog/blog.config'
import databaseConfig from './database/database.config'
import ossConfig from './oss/oss.config'
import permissionsConfig from './permissions/permissions.config'
import pushConfig from './push/push.config'
import rateLimitConfig from './rate-limit/rateLimit.config'

export default {
  database: databaseConfig,
  auth: authConfig,
  app: appConfig,
  oss: ossConfig,
  permissions: permissionsConfig,
  push: pushConfig,
  rateLimit: rateLimitConfig,
  bark: barkConfig,
  blog: blogConfig,
}
