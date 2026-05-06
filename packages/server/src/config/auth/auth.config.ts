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
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_OAUTH_CALLBACK_URL || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  allowedRedirectSchemes:
    process.env.AUTH_ALLOWED_REDIRECT_SCHEMES || 'walkingcalc,exp',
  ignore: [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/refreshToken',
    '/auth/github',
    '/auth/github/callback',
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
