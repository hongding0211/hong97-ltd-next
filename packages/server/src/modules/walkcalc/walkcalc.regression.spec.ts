import { UnauthorizedException } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { AuthGuard } from '../../guards/auth.guard'
import { WalkcalcController } from './walkcalc.controller'
import { WalkcalcModule } from './walkcalc.module'
import { WalkcalcService } from './walkcalc.service'

describe('Walkcalc migration boundaries', () => {
  it('rejects unauthenticated walkcalc requests through the current auth guard', async () => {
    const guard = new AuthGuard(
      {} as any,
      { get: jest.fn(() => []) } as any,
      {} as any,
    )
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/walkcalc/groups',
          headers: {},
          cookies: {},
        }),
      }),
    } as any

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('does not add legacy walkcalc auth routes', () => {
    const controllerPath = Reflect.getMetadata(
      PATH_METADATA,
      WalkcalcController,
    )
    const routes = Object.getOwnPropertyNames(WalkcalcController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => {
        const method = WalkcalcController.prototype[name]
        return {
          method: Reflect.getMetadata(METHOD_METADATA, method),
          path: `${controllerPath}/${Reflect.getMetadata(
            PATH_METADATA,
            method,
          )}`,
        }
      })

    expect(routes.map((route) => route.path)).not.toEqual(
      expect.arrayContaining([
        'walkcalc/user/login',
        'walkcalc/user/refreshToken',
        'walkcalc/sso',
        'walkcalc/wx',
      ]),
    )
  })

  it('does not wire push providers into the walkcalc module or service', () => {
    const providers = Reflect.getMetadata('providers', WalkcalcModule) ?? []

    expect(providers).toEqual([WalkcalcService])
    expect(WalkcalcService.toString()).not.toContain('BarkService')
    expect(WalkcalcService.toString()).not.toContain('APN')
    expect(WalkcalcService.toString()).not.toContain('apn')
  })
})
