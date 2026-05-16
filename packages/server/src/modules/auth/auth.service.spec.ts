/// <reference types="jest" />

import { UnauthorizedException } from '@nestjs/common'
import axios from 'axios'
import * as bcrypt from 'bcrypt'
import { AuthGuard } from '../../guards/auth.guard'
import { AuthService } from './auth.service'

jest.mock('axios')

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
  let apiTokens: any[]
  let apiTokenModel: any
  let userModel: any
  let refreshSessionModel: any
  let service: AuthService
  let res: any
  let createdUser: any

  const mockedAxios = axios as jest.Mocked<typeof axios>

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
        'auth.github.clientId': 'github-client-id',
        'auth.github.clientSecret': 'github-client-secret',
        'auth.github.callbackUrl':
          'http://localhost:3000/api/auth/github/callback',
        'auth.frontendUrl': 'http://localhost:3000',
      }
      return config[key]
    }),
  }

  beforeEach(async () => {
    accessTokenCount = 0
    activeSession = null
    apiTokens = []
    createdUser = null
    mockedAxios.post.mockReset()
    mockedAxios.get.mockReset()
    user.authData.local.passwordHash = await bcrypt.hash('password123', 10)
    user.save.mockClear()

    userModel = jest.fn((value: any) => {
      createdUser = {
        ...value,
        save: jest.fn(async function save(this: any) {
          return this
        }),
      }
      return createdUser
    })
    userModel.findOne = jest.fn(async (query: any) => {
      if (query?.['authData.local.email'] === 'hong@example.com') {
        return user
      }
      if (query?.userId === 'user-1') {
        return user
      }
      return null
    })

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

    apiTokenModel = {
      create: jest.fn(async (token: any) => {
        const savedToken = {
          ...token,
          createdAt: new Date('2026-05-02T00:00:00.000Z'),
          updatedAt: new Date('2026-05-02T00:00:00.000Z'),
          save: jest.fn(async function save(this: any) {
            return this
          }),
        }
        apiTokens.push(savedToken)
        return savedToken
      }),
      find: jest.fn(() => ({
        sort: jest.fn(async () => apiTokens),
      })),
      findOne: jest.fn(async (query: any) => {
        return apiTokens.find((token) => token.tokenHash === query?.tokenHash)
      }),
      deleteOne: jest.fn(async (query: any) => {
        apiTokens = apiTokens.filter(
          (token) =>
            token.userId !== query?.userId || token.tokenId !== query?.tokenId,
        )
        return { deletedCount: 1 }
      }),
    }

    service = new AuthService(
      apiTokenModel,
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

  it('creates, lists, validates, and deletes permanent API tokens', async () => {
    const created = await service.createApiToken('user-1', { name: 'CLI' })

    expect(created.apiToken).toMatch(/^h97_/)
    expect(created).toMatchObject({
      name: 'CLI',
      tokenPrefix: created.apiToken.slice(0, 12),
    })
    expect(apiTokenModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        name: 'CLI',
        tokenHash: expect.any(String),
      }),
    )
    expect(apiTokens[0]).not.toHaveProperty('apiToken')

    const listed = await service.listApiTokens('user-1')
    expect(listed).toEqual([
      expect.objectContaining({
        tokenId: created.tokenId,
        name: 'CLI',
        tokenPrefix: created.tokenPrefix,
      }),
    ])
    expect(listed[0]).not.toHaveProperty('apiToken')

    await expect(service.validateApiToken(created.apiToken)).resolves.toBe(
      'user-1',
    )
    expect(apiTokens[0].lastUsedAt).toBeInstanceOf(Date)

    await service.deleteApiToken('user-1', created.tokenId)
    await expect(service.validateApiToken(created.apiToken)).resolves.toBe(
      undefined,
    )
  })

  it('builds a GitHub authorization URL with signed state and configured callback', () => {
    const redirect = 'http://localhost:3000/tools/oss'
    const url = new URL(service.getGithubAuthorizationRedirect(redirect))

    expect(url.origin + url.pathname).toBe(
      'https://github.com/login/oauth/authorize',
    )
    expect(url.searchParams.get('client_id')).toBe('github-client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/github/callback',
    )
    expect(url.searchParams.get('scope')).toBe('read:user user:email')
    expect(url.searchParams.get('state')).toEqual(expect.any(String))
  })

  it('allows configured app redirects for GitHub authorization state', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'github-access-token' },
    })
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          id: 123,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
          html_url: 'https://github.com/octocat',
          email: null,
        },
      })
      .mockResolvedValueOnce({ data: [] })

    const authUrl = new URL(
      service.getGithubAuthorizationRedirect('walkingcalc://auth/callback'),
    )
    const redirectUrl = await service.handleGithubCallback(
      {
        code: 'github-code',
        state: authUrl.searchParams.get('state') || '',
      },
      res,
    )

    expect(redirectUrl).toBe('walkingcalc://auth/callback#access-1')
  })

  it('adds the access token hash to the internal native callback redirect after GitHub login', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'github-access-token' },
    })
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          id: 123,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
          html_url: 'https://github.com/octocat',
          email: null,
        },
      })
      .mockResolvedValueOnce({ data: [] })

    const authUrl = new URL(
      service.getGithubAuthorizationRedirect(
        'http://localhost:3000/auth/callback',
      ),
    )
    const redirectUrl = await service.handleGithubCallback(
      {
        code: 'github-code',
        state: authUrl.searchParams.get('state') || '',
      },
      res,
    )

    expect(redirectUrl).toBe('http://localhost:3000/auth/callback#access-1')
  })

  it('preserves loopback callback redirects that use 127.0.0.1 in local development', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'github-access-token' },
    })
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          id: 123,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
          html_url: 'https://github.com/octocat',
          email: null,
        },
      })
      .mockResolvedValueOnce({ data: [] })

    const authUrl = new URL(
      service.getGithubAuthorizationRedirect(
        'http://127.0.0.1:3000/auth/callback',
      ),
    )
    const redirectUrl = await service.handleGithubCallback(
      {
        code: 'github-code',
        state: authUrl.searchParams.get('state') || '',
      },
      res,
    )

    expect(redirectUrl).toBe('http://127.0.0.1:3000/auth/callback#access-1')
  })

  it('creates a local user and issues session cookies after GitHub callback', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'github-access-token' },
    })
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          id: 123,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
          html_url: 'https://github.com/octocat',
          email: null,
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            email: 'octocat@example.com',
            primary: true,
            verified: true,
          },
        ],
      })

    const authUrl = new URL(
      service.getGithubAuthorizationRedirect('http://localhost:3000/about'),
    )
    const redirectUrl = await service.handleGithubCallback(
      {
        code: 'github-code',
        state: authUrl.searchParams.get('state') || '',
      },
      res,
    )

    expect(redirectUrl).toBe('http://localhost:3000/about')
    expect(userModel).toHaveBeenCalledWith(
      expect.objectContaining({
        authProviders: ['github'],
        authData: {
          github: expect.objectContaining({
            githubId: '123',
            login: 'octocat',
            email: 'octocat@example.com',
          }),
        },
      }),
    )
    expect(createdUser.save).toHaveBeenCalled()
    expect(res.cookie).toHaveBeenCalledWith(
      'accessToken',
      'access-1',
      expect.objectContaining({ httpOnly: true }),
    )
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('updates an existing GitHub user and issues a standard app session', async () => {
    const githubUser = {
      userId: 'github-user-1',
      profile: { name: 'Old Name' },
      authProviders: ['github'],
      authData: {
        github: {
          githubId: '123',
          login: 'old-login',
        },
      },
      save: jest.fn(async function save(this: any) {
        return this
      }),
    } as any
    userModel.findOne.mockImplementation(async (query: any) => {
      if (query?.['authData.github.githubId'] === '123') {
        return githubUser
      }
      return null
    })
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'github-access-token' },
    })
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          id: 123,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
          html_url: 'https://github.com/octocat',
          email: 'octocat-public@example.com',
        },
      })
      .mockResolvedValueOnce({ data: [] })

    const authUrl = new URL(service.getGithubAuthorizationRedirect('/about'))
    const redirectUrl = await service.handleGithubCallback(
      {
        code: 'github-code',
        state: authUrl.searchParams.get('state') || '',
      },
      res,
    )

    expect(redirectUrl).toBe('http://localhost:3000/about')
    expect(githubUser.authData.github).toEqual(
      expect.objectContaining({
        githubId: '123',
        login: 'octocat',
        email: 'octocat-public@example.com',
      }),
    )
    expect(githubUser.save).toHaveBeenCalled()
    expect(res.cookie).toHaveBeenCalledWith(
      'accessToken',
      'access-1',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('rejects invalid GitHub OAuth state without calling GitHub', async () => {
    const redirectUrl = await service.handleGithubCallback(
      {
        code: 'github-code',
        state: 'invalid-state',
      },
      res,
    )

    expect(redirectUrl).toBe(
      'http://localhost:3000/sso/login?github_error=invalid_state',
    )
    expect(mockedAxios.post).not.toHaveBeenCalled()
    expect(userModel).not.toHaveBeenCalled()
    expect(res.cookie).not.toHaveBeenCalled()
  })

  it('redirects to a safe error destination when GitHub token exchange fails', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
      },
    })

    const authUrl = new URL(service.getGithubAuthorizationRedirect('/about'))
    const redirectUrl = await service.handleGithubCallback(
      {
        code: 'github-code',
        state: authUrl.searchParams.get('state') || '',
      },
      res,
    )

    expect(redirectUrl).toBe(
      'http://localhost:3000/sso/login?github_error=github',
    )
    expect(userModel).not.toHaveBeenCalled()
    expect(res.cookie).not.toHaveBeenCalled()
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
      { validateApiToken: jest.fn(async () => undefined) } as any,
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
      { validateApiToken: jest.fn(async () => undefined) } as any,
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
    const guard = new AuthGuard(
      jwtService as any,
      configService as any,
      { validateApiToken: jest.fn(async () => undefined) } as any,
    )
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

  it('uses bearer access tokens before cookies when both are present', async () => {
    const jwtService = {
      verifyAsync: jest.fn(async (token: string) => ({ sub: `${token}-user` })),
    }
    const guard = new AuthGuard(
      jwtService as any,
      configService as any,
      { validateApiToken: jest.fn(async () => undefined) } as any,
    )
    const request = {
      path: '/auth/info',
      cookies: { accessToken: 'cookie-access' },
      headers: { authorization: 'Bearer bearer-access' },
    }

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as any),
    ).resolves.toBe(true)
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('bearer-access', {
      secret: 'test-secret',
    })
    expect(request).toHaveProperty('user', { id: 'bearer-access-user' })
  })

  it('authenticates protected requests with a bearer API token', async () => {
    const jwtService = {
      verifyAsync: jest.fn(async () => {
        throw new UnauthorizedException('expired')
      }),
    }
    const authService = {
      validateApiToken: jest.fn(async () => 'user-from-api-token'),
    }
    const guard = new AuthGuard(
      jwtService as any,
      configService as any,
      authService as any,
    )
    const request = {
      path: '/auth/info',
      cookies: {},
      headers: { authorization: 'Bearer h97_valid-token' },
    }

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as any),
    ).resolves.toBe(true)
    expect(authService.validateApiToken).toHaveBeenCalledWith('h97_valid-token')
    expect(request).toHaveProperty('user', { id: 'user-from-api-token' })
  })
})
