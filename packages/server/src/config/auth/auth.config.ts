import { registerAs } from '@nestjs/config'

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    accessExpiresIn:
      process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cookies: {
    accessTokenName: process.env.AUTH_ACCESS_COOKIE_NAME || 'accessToken',
    refreshTokenName: process.env.AUTH_REFRESH_COOKIE_NAME || 'refreshToken',
    legacyTokenName: 'token',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'strict',
    secure:
      process.env.AUTH_COOKIE_SECURE === 'true' ||
      process.env.NODE_ENV === 'production',
  },
  ignore: [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/refreshToken',
    '/oss/requestUpload',
    '/trash/detail/*',
    '/shortlink/redirect/*',
  ],
  softIgnore: [
    '/blog/*',
    '/ucp/config/list',
    '/ucp/config/all',
    '/trash/like',
    '/trash/list',
    '/trash/comment/*',
    '/auth/isAdmin',
  ],
  rootUsers: process.env.ROOT_USERS ? process.env.ROOT_USERS.split(',') : [],
}))
