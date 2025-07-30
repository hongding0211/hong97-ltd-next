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
      .then((v) => v.data as HttpResponse<K>)
      .catch((err: AxiosError) => {
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

  setLocale(locale?: string) {
    this.locale = locale ?? 'cn'
  }

  get<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
  ): Promise<HttpResponse<K>> {
    return this.handler<K>(
      this.axiosInstance.get(PATHS[name], {
        params,
        headers: this.getCustomHeaders(),
      }),
    )
  }

  post<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
  ): Promise<HttpResponse<K>> {
    return this.handler<K>(
      this.axiosInstance.post(PATHS[name], body, {
        headers: this.getCustomHeaders(),
      }),
    )
  }

  put<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
  ): Promise<HttpResponse<K>> {
    return this.handler<K>(
      this.axiosInstance.put(PATHS[name], body, {
        headers: this.getCustomHeaders(),
      }),
    )
  }

  delete<K extends keyof APIs>(
    name: K,
    params?: APIs[K]['request']['params'],
  ): Promise<HttpResponse<K>> {
    return this.handler<K>(
      this.axiosInstance.delete(PATHS[name], {
        params,
        headers: this.getCustomHeaders(),
      }),
    )
  }

  patch<K extends keyof APIs>(
    name: K,
    body?: APIs[K]['request']['body'],
  ): Promise<HttpResponse<K>> {
    return this.handler<K>(
      this.axiosInstance.patch(PATHS[name], body, {
        headers: this.getCustomHeaders(),
      }),
    )
  }
}

export const http = new Http()
