import { ACCESS_TOKEN_KEY } from '@constants'
import axios, { AxiosError, AxiosInstance } from 'axios'
import { runOnClient } from '../utils/run-on-client'
import { toast } from '../utils/toast'
import { APIs, HttpResponse } from './types'
import { BASE_URL, PATHS } from './urls'

class Http {
  private axiosInstance: AxiosInstance
  private locale: string

  constructor() {
    let accessToken = ''
    runOnClient(() => {
      accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) ?? ''
    })
    this.locale = 'cn'
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
      },
    })
  }

  private handler<K extends keyof APIs>(
    p: Promise<any>,
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
          toast('unauthorized', {
            type: 'error',
          })
          runOnClient(() => {
            localStorage.removeItem(ACCESS_TOKEN_KEY)
          })
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

  private getCustomHeaders() {
    return {
      'X-Locale': this.locale,
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

  setLocale(locale?: string) {
    this.locale = locale ?? 'cn'
  }

  get<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.get(url, {
        params,
        headers: this.getCustomHeaders(),
      }),
    )
  }

  post<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name)
    return this.handler<K>(
      this.axiosInstance.post(url, body, {
        headers: this.getCustomHeaders(),
      }),
    )
  }

  put<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
    params?: APIs[K]['request']['params'],
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.put(url, body, {
        headers: this.getCustomHeaders(),
      }),
    )
  }

  delete<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name, params)
    return this.handler<K>(
      this.axiosInstance.delete(url, {
        params,
        headers: this.getCustomHeaders(),
      }),
    )
  }

  patch<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
  ): Promise<HttpResponse<K>> {
    const url = this.buildUrl(name)
    return this.handler<K>(
      this.axiosInstance.patch(url, body, {
        headers: this.getCustomHeaders(),
      }),
    )
  }
}

export const http = new Http()
