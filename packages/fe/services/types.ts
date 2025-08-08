import { AuthAPIS } from './auth/types'
import { BlogAPIS } from './blog/types'
import { OssAPIS } from './oss/types'
import { TrashAPIS } from './trash/types'
import { UCPAPIS } from './ucp/types'
type ExtractFromDto<T> = T extends abstract new (
  ..._args: any
) => infer R
  ? R
  : T extends (...args: any[]) => infer R
    ? R
    : T

export type API<P = unknown, B = unknown, R = unknown> = {
  request: {
    params?: ExtractFromDto<P>
    body?: ExtractFromDto<B>
  }
  responseData: ExtractFromDto<R>
}

export type HttpResponse<K extends keyof APIs> = {
  isSuccess: boolean
  data: APIs[K]['responseData']
  msg?: string
  errCode?: number
}

export type APIs = AuthAPIS & OssAPIS & BlogAPIS & UCPAPIS & TrashAPIS
