import { isClient } from '@utils/run-on-server'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { GetServerSidePropsContext } from 'next'
import { i18n } from 'next-i18next'
import { toast } from '../utils/toast'
import { AUTH_REFRESH_EXCLUDED_PATHS } from './http.config'
import { APIs, HttpResponse } from './types'
import { BASE_URL, PATHS } from './urls'

export interface HttpOptions {
  locale?: string
  ignoreUnauthorized?: boolean
  serverSideCtx?: GetServerSidePropsContext
  enableOnlyWithAuthInServerSide?: boolean
}

type RetryableRequestConfig = AxiosRequestConfig & {
  _skipAuthRefresh?: boolean
  _retryAfterAuthRefresh?: boolean
  _serverSideCtx?: GetServerSidePropsContext
}

type ServerAuthState = {
  refreshTokenPromise?: Promise<void>
}

type ServerSideContextWithAuth = GetServerSidePropsContext & {
  __hong97AuthState?: ServerAuthState
}

const ACCESS_TOKEN_COOKIE_NAME = 'accessToken'
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken'

class Http {
  private axiosInstance: AxiosInstance
  private refreshTokenPromise?: Promise<void>

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
    })
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (err: AxiosError<any>) => {
        if (!this.shouldRefreshToken(err)) {
          return Promise.reject(err)
        }

        const originalRequest = err.config as RetryableRequestConfig
        originalRequest._retryAfterAuthRefresh = true

        try {
          if (
            !isClient &&
            this.serverCookieChangedSinceRequest(originalRequest)
          ) {
            this.setRequestCookieHeader(
              originalRequest,
              this.getServerCookieHeader(originalRequest._serverSideCtx),
            )
            return this.axiosInstance.request(originalRequest)
          }

          await this.refreshToken({
            serverSideCtx: originalRequest._serverSideCtx,
          })
          if (!isClient) {
            this.setRequestCookieHeader(
              originalRequest,
              this.getServerCookieHeader(originalRequest._serverSideCtx),
            )
          }
          return this.axiosInstance.request(originalRequest)
        } catch {
          return Promise.reject(err)
        }
      },
    )
  }

  private shouldRefreshToken(err: AxiosError<any>): boolean {
    const request = err.config as RetryableRequestConfig | undefined
    if (
      !request ||
      request._skipAuthRefresh ||
      request._retryAfterAuthRefresh
    ) {
      return false
    }

    const url = request.url || ''
    if (AUTH_REFRESH_EXCLUDED_PATHS.some((authUrl) => url.includes(authUrl))) {
      return false
    }

    if (err.response?.status !== 401) {
      return false
    }

    if (isClient) {
      return true
    }

    return this.hasServerAuthCookie(request._serverSideCtx)
  }

  private async refreshToken(opts?: HttpOptions): Promise<void> {
    if (isClient) {
      if (!this.refreshTokenPromise) {
        this.refreshTokenPromise = this.axiosInstance
          .post(PATHS.PostRefreshToken, undefined, {
            headers: this.getCustomHeaders(),
            _skipAuthRefresh: true,
          } as RetryableRequestConfig)
          .then(() => undefined)
          .finally(() => {
            this.refreshTokenPromise = undefined
          })
      }

      return this.refreshTokenPromise
    }

    const ctx = opts?.serverSideCtx
    if (!ctx) {
      return Promise.reject(new Error('Missing SSR context for auth refresh'))
    }

    const authState = this.getServerAuthState(ctx)
    if (!authState.refreshTokenPromise) {
      authState.refreshTokenPromise = this.axiosInstance
        .post(PATHS.PostRefreshToken, undefined, {
          baseURL: this.getRequestBaseUrl(opts),
          headers: this.getCustomHeaders(opts),
          _skipAuthRefresh: true,
          _serverSideCtx: ctx,
        } as RetryableRequestConfig)
        .then((response) => {
          this.applyServerSetCookies(ctx, response.headers?.['set-cookie'])
        })
        .then(() => undefined)
        .finally(() => {
          authState.refreshTokenPromise = undefined
        })
    }

    return authState.refreshTokenPromise
  }

  private handler<K extends keyof APIs>(
    p: Promise<any>,
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    return p
      .then((v) => {
        // 处理204 No Content响应
        if (v.status === 204 || !v.data) {
          return {
            isSuccess: true,
            data: undefined as any,
          } as HttpResponse<K>
        }
        return v.data as HttpResponse<K>
      })
      .catch((err: AxiosError<any>) => {
        /** Lost login session */
        if (err.response?.status === 401) {
          if (!opts?.ignoreUnauthorized) {
            toast('unauthorized', {
              type: 'error',
            })
          }
          return Promise.reject(err)
        }
        if (err.response?.status === 403) {
          if (err.response?.data?.message) {
            toast(err.response.data.message, {
              type: 'error',
            })
          }
          return Promise.reject(err)
        }
        /** Rate limiting */
        if (err.response?.status === 429) {
          toast('ratelimited', {
            type: 'error',
          })
          return Promise.reject(err)
        }
        /** Common error */
        toast('commonError', {
          type: 'error',
        })
        return Promise.reject(err)
      })
  }

  private getCustomHeaders(opts?: HttpOptions) {
    return {
      ...(isClient ? {} : opts?.serverSideCtx?.req?.headers ?? {}),
      'X-Locale':
        opts?.locale || opts?.serverSideCtx?.locale || i18n.language || 'en',
    }
  }

  private getServerAuthState(ctx: GetServerSidePropsContext): ServerAuthState {
    const context = ctx as ServerSideContextWithAuth
    if (!context.__hong97AuthState) {
      context.__hong97AuthState = {}
    }

    return context.__hong97AuthState
  }

  private getServerCookieHeader(
    ctx?: GetServerSidePropsContext,
  ): string | undefined {
    const cookieHeader = ctx?.req?.headers?.cookie
    return Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader
  }

  private getRequestCookieHeader(
    request?: RetryableRequestConfig,
  ): string | undefined {
    const headers = request?.headers as any
    if (!headers) {
      return undefined
    }

    return (
      headers.cookie ||
      headers.Cookie ||
      (typeof headers.get === 'function'
        ? headers.get('cookie') || headers.get('Cookie')
        : undefined)
    )
  }

  private setRequestCookieHeader(
    request: RetryableRequestConfig,
    cookieHeader?: string,
  ): void {
    if (!cookieHeader) {
      return
    }

    request.headers = {
      ...(request.headers as any),
      cookie: cookieHeader,
    }
  }

  private serverCookieChangedSinceRequest(
    request: RetryableRequestConfig,
  ): boolean {
    const currentCookieHeader = this.getServerCookieHeader(
      request._serverSideCtx,
    )
    const requestCookieHeader = this.getRequestCookieHeader(request)

    return Boolean(
      currentCookieHeader &&
        requestCookieHeader &&
        currentCookieHeader !== requestCookieHeader,
    )
  }

  private parseCookieHeader(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) {
      return {}
    }

    return cookieHeader
      .split(';')
      .reduce<Record<string, string>>((cookies, part) => {
        const cookie = part.trim()
        const separatorIndex = cookie.indexOf('=')
        if (separatorIndex <= 0) {
          return cookies
        }

        cookies[cookie.slice(0, separatorIndex)] = cookie.slice(
          separatorIndex + 1,
        )
        return cookies
      }, {})
  }

  private serializeCookieHeader(cookies: Record<string, string>): string {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }

  private normalizeHeaderValue(
    header: string | string[] | number | undefined,
  ): string[] {
    if (!header) {
      return []
    }

    return Array.isArray(header) ? header.map(String) : [String(header)]
  }

  private isExpiredSetCookie(setCookie: string): boolean {
    return /;\s*(max-age=0|expires=thu,\s*01 jan 1970)/i.test(setCookie)
  }

  private applyServerSetCookies(
    ctx: GetServerSidePropsContext,
    setCookieHeader?: string | string[],
  ): void {
    const setCookies = this.normalizeHeaderValue(setCookieHeader)
    if (!setCookies.length) {
      return
    }

    const existingSetCookies = this.normalizeHeaderValue(
      ctx.res.getHeader('Set-Cookie'),
    )
    ctx.res.setHeader('Set-Cookie', [...existingSetCookies, ...setCookies])

    const cookies = this.parseCookieHeader(this.getServerCookieHeader(ctx))
    setCookies.forEach((setCookie) => {
      const cookiePair = setCookie.split(';')[0]
      const separatorIndex = cookiePair.indexOf('=')
      if (separatorIndex <= 0) {
        return
      }

      const name = cookiePair.slice(0, separatorIndex)
      const value = cookiePair.slice(separatorIndex + 1)
      if (this.isExpiredSetCookie(setCookie)) {
        delete cookies[name]
      } else {
        cookies[name] = value
      }
    })

    const nextCookieHeader = this.serializeCookieHeader(cookies)
    ctx.req.headers.cookie = nextCookieHeader
    ;(ctx.req as any).cookies = cookies
  }

  private hasServerAuthCookie(ctx?: GetServerSidePropsContext): boolean {
    if (!ctx) {
      return false
    }

    const cookies = {
      ...this.parseCookieHeader(this.getServerCookieHeader(ctx)),
      ...(ctx.req.cookies || {}),
    }

    return Boolean(
      cookies[ACCESS_TOKEN_COOKIE_NAME] || cookies[REFRESH_TOKEN_COOKIE_NAME],
    )
  }

  private getRequestBaseUrl(opts?: HttpOptions) {
    if (isClient || !BASE_URL?.startsWith('/')) {
      return BASE_URL
    }

    const headers = opts?.serverSideCtx?.req?.headers
    const hostHeader = headers?.['x-forwarded-host'] || headers?.host
    const protocolHeader = headers?.['x-forwarded-proto']
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader
    const protocol = Array.isArray(protocolHeader)
      ? protocolHeader[0]
      : protocolHeader || 'http'

    return host ? `${protocol}://${host}${BASE_URL}` : BASE_URL
  }

  private skipHandler(opts?: HttpOptions): boolean {
    if (
      !isClient &&
      opts?.enableOnlyWithAuthInServerSide &&
      !this.hasServerAuthCookie(opts.serverSideCtx)
    ) {
      return true
    }

    return false
  }

  private buildUrl<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
  ): string {
    let url = PATHS[name]

    if (params && typeof params === 'object') {
      // Replace URL parameters like :id with actual values
      Object.keys(params).forEach((key) => {
        const value = (params as any)[key]
        url = url.replace(`:${key}`, encodeURIComponent(value))
      })
    }

    return url
  }

  get<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    if (this.skipHandler(opts)) {
      return
    }
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.get(url, {
        baseURL: this.getRequestBaseUrl(opts),
        params,
        headers: this.getCustomHeaders(opts),
        _serverSideCtx: opts?.serverSideCtx,
      } as RetryableRequestConfig),
      opts,
    )
  }

  post<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    if (this.skipHandler(opts)) {
      return
    }
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.post(url, body, {
        baseURL: this.getRequestBaseUrl(opts),
        headers: this.getCustomHeaders(opts),
        _serverSideCtx: opts?.serverSideCtx,
      } as RetryableRequestConfig),
      opts,
    )
  }

  put<K extends keyof APIs>(
    name: K,
    body?: Partial<APIs[K]['request']['body']>,
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    if (this.skipHandler(opts)) {
      return
    }
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.put(url, body, {
        baseURL: this.getRequestBaseUrl(opts),
        headers: this.getCustomHeaders(opts),
        _serverSideCtx: opts?.serverSideCtx,
      } as RetryableRequestConfig),
      opts,
    )
  }

  delete<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    if (this.skipHandler(opts)) {
      return
    }
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.delete(url, {
        baseURL: this.getRequestBaseUrl(opts),
        params,
        headers: this.getCustomHeaders(opts),
        _serverSideCtx: opts?.serverSideCtx,
      } as RetryableRequestConfig),
      opts,
    )
  }

  patch<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    if (this.skipHandler(opts)) {
      return
    }
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.patch(url, body, {
        baseURL: this.getRequestBaseUrl(opts),
        headers: this.getCustomHeaders(opts),
        _serverSideCtx: opts?.serverSideCtx,
      } as RetryableRequestConfig),
      opts,
    )
  }
}

export const http = new Http()
