import { isClient } from '@utils/run-on-server'
import axios, { AxiosError, AxiosInstance } from 'axios'
import { GetServerSidePropsContext } from 'next'
import { i18n } from 'next-i18next'
import { toast } from '../utils/toast'
import { APIs, HttpResponse } from './types'
import { BASE_URL, PATHS } from './urls'

export interface HttpOptions {
  locale?: string
  ignoreUnauthorized?: boolean
  serverSideCtx?: GetServerSidePropsContext
}

class Http {
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
    })
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
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.get(url, {
        params,
        headers: this.getCustomHeaders(opts),
      }),
      opts,
    )
  }

  post<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.post(url, body, {
        headers: this.getCustomHeaders(opts),
      }),
      opts,
    )
  }

  put<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.put(url, body, {
        headers: this.getCustomHeaders(opts),
      }),
      opts,
    )
  }

  delete<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.delete(url, {
        params,
        headers: this.getCustomHeaders(opts),
      }),
      opts,
    )
  }

  patch<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
    params?: APIs[K]['request']['params'],
    opts?: HttpOptions,
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.patch(url, body, {
        headers: this.getCustomHeaders(opts),
      }),
      opts,
    )
  }
}

export const http = new Http()
