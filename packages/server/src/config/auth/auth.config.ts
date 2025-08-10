import { registerAs } from '@nestjs/config'

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  ignore: [
    '/auth/login',
    '/auth/register',
    '/oss/requestUpload',
    '/trash/detail/*',
  ],
  softIgnore: [
    '/blog/*',
    '/ucp/config/list',
    '/ucp/config/all',
    '/trash/like',
    '/trash/list',
    '/trash/comment/*',
  ],
  rootUsers: process.env.ROOT_USERS ? process.env.ROOT_USERS.split(',') : [],
}))
