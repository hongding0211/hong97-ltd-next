import { ACCESS_TOKEN_KEY } from '@constants'
import axios, { AxiosError, AxiosInstance } from 'axios'
import { runOnClient } from '../utils/run-on-client'
import { toast } from '../utils/toast'
import { APIs, HttpResponse } from './types'
import { BASE_URL, PATHS } from './urls'
import { runOnServer } from '@utils/run-on-server'

class Http {
  private axiosInstance: AxiosInstance
  private locale: string
  private cookieToken: string

  constructor() {
    let accessToken = ''
    runOnClient(() => {
      accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) ?? ''
    })
    runOnServer(() => {
      this.cookieToken && (accessToken = this.cookieToken)
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
        if (err.response?.status === 401 || err.response?.status === 403) {
          toast('unauthorized', {
            type: 'error',
          })
          runOnClient(() => {
            localStorage.removeItem(ACCESS_TOKEN_KEY)
          })
          return Promise.reject()
        }
        /** Rate limiting */
        if (err.response?.status === 429) {
          toast('ratelimited', {
            type: 'error',
          })
          return Promise.reject()
        }
        /** Common error */
        toast('commonError', {
          type: 'error',
        })
        return Promise.reject()
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

  setCookieToken(token: string) {
    this.cookieToken = token
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
