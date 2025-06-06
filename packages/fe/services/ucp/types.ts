import { AppendDto } from '@server/modules/ucp/dto/append.dto'
import {
  CreateDto,
  CreateResponseDto,
} from '@server/modules/ucp/dto/create.dto'
import { DetailDto } from '@server/modules/ucp/dto/detail.dto'
import { DetailResponseDto } from '@server/modules/ucp/dto/detail.dto'
import { ListResponseDto } from '@server/modules/ucp/dto/list.dto'
import { API } from '../types'
import { ConfigListDto, ConfigListResponseDto } from '@server/modules/ucp/dto/config-list'
import { EditConfigItemDto } from '@server/modules/ucp/dto/editConfigItem'

export type UCPAPIS = {
  GetUcpList: API<undefined, undefined, typeof ListResponseDto>
  PostUcpCreate: API<undefined, typeof CreateDto, typeof CreateResponseDto>
  GetUcpDetail: API<undefined, typeof DetailDto, typeof DetailResponseDto>
  GetUcpConfigList: API<undefined, typeof ConfigListDto, typeof ConfigListResponseDto>
  PostUcpAppend: API<undefined, typeof AppendDto, undefined>
  PutUcpConfigUpdate: API<undefined, typeof EditConfigItemDto, undefined>
  DeleteUcpConfig: API<typeof EditConfigItemDto, undefined, undefined>
}
