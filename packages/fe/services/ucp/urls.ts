import { UCPAPIS } from './types'

export const UCP_PATHS: Record<keyof UCPAPIS, string> = {
  GetUcpList: 'ucp/list',
  PostUcpCreate: 'ucp/create',
  GetUcpDetail: 'ucp/detail',
  GetUcpConfigList: 'ucp/config/list',
  PostUcpAppend: 'ucp/config/append',
  PutUcpConfigUpdate: 'ucp/config/update',
  DeleteUcpConfig: 'ucp/config',
}
