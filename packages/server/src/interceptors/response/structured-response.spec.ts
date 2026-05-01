import { CallHandler, ExecutionContext } from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { lastValueFrom, of, throwError } from 'rxjs'
import { GeneralException } from '../../exceptions/general-exceptions'
import { StructuredResponseInterceptor } from './structured-response'

describe('StructuredResponseInterceptor', () => {
  let interceptor: StructuredResponseInterceptor
  let i18n: { t: jest.Mock }

  const context = {} as ExecutionContext

  const createNext = (handle: CallHandler['handle']): CallHandler => ({
    handle,
  })

  beforeEach(() => {
    i18n = {
      t: jest.fn((key: string) => `translated:${key}`),
    }
    interceptor = new StructuredResponseInterceptor(
      i18n as unknown as I18nService,
    )
  })

  it('wraps plain successful results', async () => {
    const data = { id: '123', name: 'demo' }
    const next = createNext(() => of(data))

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      isSuccess: true,
      data,
    })
  })

  it('passes through already structured responses', async () => {
    const response = {
      isSuccess: false,
      data: null,
      msg: 'failed',
      errCode: 1001,
    }
    const next = createNext(() => of(response))

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe(response)
  })

  it('passes through structured responses that omit optional fields', async () => {
    const response = {
      isSuccess: true,
      data: { ok: true },
    }
    const next = createNext(() => of(response))

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe(response)
  })

  it('maps GeneralException errors to canonical structured error responses', async () => {
    const error = new GeneralException('auth.invalidLoginType' as any, 1002)
    const next = createNext(() => throwError(() => error))

    const response = await lastValueFrom(interceptor.intercept(context, next))

    expect(response).toEqual({
      isSuccess: false,
      msg: 'translated:auth.invalidLoginType',
      errCode: 1002,
      data: null,
    })
    expect(response).not.toHaveProperty('iSuccess')
    expect(response).not.toHaveProperty('code')
    expect(i18n.t).toHaveBeenCalledWith('auth.invalidLoginType')
  })

  it('rethrows unexpected errors', async () => {
    const error = new Error('boom')
    const next = createNext(() => throwError(() => error))

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(error)
  })
})
