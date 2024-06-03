import axios, { AxiosError, AxiosInstance } from 'axios'
import { emitter } from '../utils/emitter'
import { APIs, RequesterResponse } from './types'
import { BASE_URL, PATHS } from './urls'
class Requester<K extends keyof APIs> {
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
    })
  }

  private handler(p: Promise<RequesterResponse<K>>) {
    return p
      .then((res) => {
        if (res.isSuccess) {
          return res.data
        }
        /** 业务层的错误逻辑返回 */
        return Promise.reject({
          msg: res.msg,
          errCode: res.errCode,
        })
      })
      .catch((err: AxiosError) => {
        /** Lost login session */
        if (err.response?.status === 401 || err.response?.status === 403) {
          emitter.emit('toast', {
            msg: 'unauthorized',
            type: 'error',
          })
          return
        }
        /** Rate limiting */
        if (err.response?.status === 429) {
          emitter.emit('toast', {
            msg: 'ratelimited',
            type: 'error',
          })
          return
        }
        /** Common error */
        emitter.emit('toast', {
          msg: 'commonError',
          type: 'error',
        })
      })
  }

  get(name: K, params?: APIs[K]['request']['params']) {
    return this.handler(
      this.axiosInstance.get<any, RequesterResponse<K>>(PATHS[name], {
        params,
      }),
    )
  }

  post(name: K, body?: APIs[K]['request']['body']) {
    return this.handler(
      this.axiosInstance.post<any, RequesterResponse<K>>(PATHS[name], body),
    )
  }

  put(name: K, body?: APIs[K]['request']['body']) {
    return this.handler(
      this.axiosInstance.put<any, RequesterResponse<K>>(PATHS[name], body),
    )
  }

  delete(name: K, params?: APIs[K]['request']['params']) {
    return this.handler(
      this.axiosInstance.delete<any, RequesterResponse<K>>(PATHS[name], {
        params,
      }),
    )
  }

  patch(name: K, body?: APIs[K]['request']['body']) {
    return this.handler(
      this.axiosInstance.patch<any, RequesterResponse<K>>(PATHS[name], body),
    )
  }
}

export const requester = new Requester()
