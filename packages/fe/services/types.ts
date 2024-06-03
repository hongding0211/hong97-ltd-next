import { AuthAPIS } from './auth/types'

export type API<P = unknown, B = unknown, R = unknown> = {
  request: {
    params?: P
    body?: B
  }
  responseData: R
}

export type RequesterResponse<K extends keyof APIs> = {
  isSuccess: boolean
  data: APIs[K]['responseData']
  msg?: string
  errCode?: number
}

export type APIs = AuthAPIS
