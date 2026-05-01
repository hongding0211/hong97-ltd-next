/// <reference types="jest" />

import { UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AuthGuard } from '../../guards/auth.guard'
import { AuthService } from './auth.service'

describe('AuthService token flow', () => {
  const user = {
    userId: 'user-1',
    profile: { name: 'Hong' },
    authData: {
      local: {
        email: 'hong@example.com',
        passwordHash: '',
      },
    },
    authProviders: ['local'],
    save: jest.fn(),
  } as any

  let accessTokenCount: number
  let activeSession: any
  let userModel: any
  let refreshSessionModel: any
  let service: AuthService
  let res: any

  const configService = {
    get: jest.fn((key: string) => {
      const config: Record<string, unknown> = {
        'auth.jwt.secret': 'test-secret',
        'auth.jwt.expiresIn': '15m',
        'auth.jwt.accessExpiresIn': '15m',
        'auth.jwt.refreshExpiresIn': '30d',
        'auth.cookies.accessTokenName': 'accessToken',
        'auth.cookies.refreshTokenName': 'refreshToken',
        'auth.cookies.legacyTokenName': 'token',
        'auth.cookies.sameSite': 'strict',
        'auth.cookies.secure': false,
      }
      return config[key]
    }),
  }

  beforeEach(async () => {
    accessTokenCount = 0
    activeSession = null
    user.authData.local.passwordHash = await bcrypt.hash('password123', 10)
    user.save.mockClear()

    userModel = {
      findOne: jest.fn(async (query: any) => {
        if (query?.['authData.local.email'] === 'hong@example.com') {
          return user
        }
        if (query?.userId === 'user-1') {
          return user
        }
        return null
      }),
    }

    refreshSessionModel = {
      create: jest.fn(async (session: any) => {
        activeSession = {
          ...session,
          save: jest.fn(async function save(this: any) {
            return this
          }),
        }
        return activeSession
      }),
      findOne: jest.fn(async (query: any) => {
        if (query?.sessionId === activeSession?.sessionId) {
          return activeSession
        }
        return null
      }),
    }

    service = new AuthService(
      userModel,
      refreshSessionModel,
      {
        sign: jest.fn(() => `access-${++accessTokenCount}`),
      } as any,
      configService as any,
      {
        mapUserToResponse: jest.fn((value: any) => ({
          userId: value.userId,
          profile: value.profile,
        })),
      } as any,
    )

    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }
  })

  async function login() {
    return service.login(
      {
        type: 'local',
        credentials: {
          email: 'hong@example.com',
          password: 'password123',
        },
      } as any,
      res,
    )
  }

  function getCookieValue(name: string): string {
    return res.cookie.mock.calls.find((call: any[]) => call[0] === name)?.[1]
  }

  it('returns access token fields and sets separate httpOnly cookies on login', async () => {
    const result = await login()

    expect(result).toEqual({
      accessToken: 'access-1',
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '30d',
      user: {
        userId: 'user-1',
        profile: { name: 'Hong' },
      },
    })
    expect(result).not.toHaveProperty('token')
    expect(result).not.toHaveProperty('refreshToken')
    expect(res.cookie).toHaveBeenCalledWith(
      'accessToken',
      'access-1',
      expect.objectContaining({ httpOnly: true, maxAge: 15 * 60 * 1000 }),
    )
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      }),
    )
    expect(refreshSessionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    )
  })

  it('refreshes from the refresh cookie and rotates the stored token hash', async () => {
    await login()
    const firstRefreshToken = getCookieValue('refreshToken')
    const firstTokenHash = activeSession.tokenHash
    res.cookie.mockClear()
    res.clearCookie.mockClear()

    const result = await service.refreshToken(
      { cookies: { refreshToken: firstRefreshToken } } as any,
      res,
    )

    expect(result).toEqual({
      accessToken: 'access-2',
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '30d',
    })
    expect(activeSession.tokenHash).not.toEqual(firstTokenHash)
    expect(activeSession.rotatedAt).toBeInstanceOf(Date)
    expect(res.cookie).toHaveBeenCalledWith(
      'accessToken',
      'access-2',
      expect.objectContaining({ httpOnly: true }),
    )
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.not.stringMatching(firstRefreshToken),
      expect.objectContaining({ httpOnly: true, path: '/' }),
    )
  })

  it('rejects missing refresh tokens', async () => {
    await expect(
      service.refreshToken({ cookies: {} } as any, res),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rejects expired refresh sessions', async () => {
    await login()
    const refreshToken = getCookieValue('refreshToken')
    activeSession.expiresAt = new Date(Date.now() - 1000)

    await expect(
      service.refreshToken({ cookies: { refreshToken } } as any, res),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rejects revoked refresh sessions', async () => {
    await login()
    const refreshToken = getCookieValue('refreshToken')
    activeSession.revokedAt = new Date()

    await expect(
      service.refreshToken({ cookies: { refreshToken } } as any, res),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('revokes the session when an old refresh token is reused', async () => {
    await login()
    const firstRefreshToken = getCookieValue('refreshToken')

    await service.refreshToken(
      { cookies: { refreshToken: firstRefreshToken } } as any,
      res,
    )

    await expect(
      service.refreshToken(
        { cookies: { refreshToken: firstRefreshToken } } as any,
        res,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(activeSession.revokedAt).toBeInstanceOf(Date)
  })

  it('logout clears both auth cookies and prevents later refresh', async () => {
    await login()
    const refreshToken = getCookieValue('refreshToken')

    await service.logout({ cookies: { refreshToken } } as any, res)

    expect(res.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.objectContaining({ path: '/' }),
    )
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ path: '/' }),
    )
    expect(res.clearCookie).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ path: '/' }),
    )
    await expect(
      service.refreshToken({ cookies: { refreshToken } } as any, res),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })
})

describe('AuthGuard token extraction', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const config: Record<string, unknown> = {
        'auth.ignore': [],
        'auth.softIgnore': [],
        'auth.jwt.secret': 'test-secret',
        'auth.cookies.accessTokenName': 'accessToken',
      }
      return config[key]
    }),
  }

  it('authenticates protected requests with an access token cookie', async () => {
    const guard = new AuthGuard(
      {
        verifyAsync: jest.fn(async () => ({ sub: 'user-1' })),
      } as any,
      configService as any,
    )
    const request = {
      path: '/auth/info',
      cookies: { accessToken: 'valid-access' },
      headers: {},
    }

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as any),
    ).resolves.toBe(true)
    expect(request).toHaveProperty('user', { id: 'user-1' })
  })

  it('rejects refresh-token-only protected requests', async () => {
    const guard = new AuthGuard(
      {
        verifyAsync: jest.fn(),
      } as any,
      configService as any,
    )

    await expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/auth/info',
            cookies: { refreshToken: 'refresh-only' },
            headers: {},
          }),
        }),
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('authenticates protected requests with a bearer access token', async () => {
    const jwtService = {
      verifyAsync: jest.fn(async () => ({ sub: 'user-1' })),
    }
    const guard = new AuthGuard(jwtService as any, configService as any)
    const request = {
      path: '/auth/info',
      cookies: {},
      headers: { authorization: 'Bearer valid-access' },
    }

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as any),
    ).resolves.toBe(true)
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-access', {
      secret: 'test-secret',
    })
  })
})
