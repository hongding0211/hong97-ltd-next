import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { App } from 'supertest/types'
import { StructuredResponseInterceptor } from '../src/interceptors/response/structured-response'
import { AuthController } from '../src/modules/auth/auth.controller'
import { AuthService } from '../src/modules/auth/auth.service'

describe('Auth refresh token HTTP flow (e2e)', () => {
  let app: INestApplication<App>
  let activeSession: any
  let accessTokenCount: number

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

  beforeEach(async () => {
    accessTokenCount = 0
    activeSession = null
    user.authData.local.passwordHash = await bcrypt.hash('password123', 10)
    user.save.mockClear()

    const refreshSessionModel = {
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

    const userModel = {
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

    const configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, unknown> = {
          'auth.jwt.accessExpiresIn': '15m',
          'auth.jwt.refreshExpiresIn': '30d',
          'auth.cookies.accessTokenName': 'accessToken',
          'auth.cookies.refreshTokenName': 'refreshToken',
          'auth.cookies.legacyTokenName': 'token',
          'auth.cookies.sameSite': 'strict',
          'auth.cookies.secure': false,
          'auth.rootUsers': [],
        }
        return config[key]
      }),
    }

    const service = new AuthService(
      { create: jest.fn(), find: jest.fn(), findOne: jest.fn() } as any,
      userModel as any,
      refreshSessionModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: service },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.use(cookieParser())
    app.useGlobalInterceptors(
      new StructuredResponseInterceptor({ t: (key: string) => key } as any),
    )
    await app.init()
  })

  afterEach(async () => {
    await app?.close()
  })

  it('accepts the current refresh cookie when a native body refresh token is stale', async () => {
    const agent = request.agent(app.getHttpServer())
    const login = await agent
      .post('/auth/login')
      .send({
        type: 'local',
        credentials: {
          email: 'hong@example.com',
          password: 'password123',
        },
      })
      .expect(200)

    const firstRefreshToken = login.body.data.refreshToken

    const firstRefresh = await agent.post('/auth/refreshToken').expect(200)

    const currentRefreshToken = firstRefresh.body.data.refreshToken

    const secondRefresh = await agent
      .post('/auth/refreshToken')
      .send({ refreshToken: firstRefreshToken })
      .expect(200)

    expect(secondRefresh.body).toEqual({
      isSuccess: true,
      data: {
        accessToken: 'access-3',
        refreshToken: expect.any(String),
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '30d',
      },
    })
    expect(secondRefresh.body.data.refreshToken).not.toEqual(
      currentRefreshToken,
    )
    expect(activeSession.revokedAt).toBeNull()
  })
})
