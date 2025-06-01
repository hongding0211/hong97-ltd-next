import { UCPAPIS } from './types'

export const UCP_PATHS: Record<keyof UCPAPIS, string> = {
  GetUcpList: 'ucp/list',
  PostUcpCreate: 'ucp/create',
  GetUcpDetail: 'ucp/detail',
  GetUcpDetailByUcpId: 'ucp/ucpDetail',
}
