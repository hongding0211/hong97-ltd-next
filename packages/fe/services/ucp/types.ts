import { AppendDto } from '@server/modules/ucp/dto/append.dto'
import {
  ConfigListAllResponseDto,
  ConfigListDto,
  ConfigListResponseDto,
} from '@server/modules/ucp/dto/config-list'
import {
  CreateDto,
  CreateResponseDto,
} from '@server/modules/ucp/dto/create.dto'
import { DetailDto } from '@server/modules/ucp/dto/detail.dto'
import { DetailResponseDto } from '@server/modules/ucp/dto/detail.dto'
import { EditConfigItemDto } from '@server/modules/ucp/dto/editConfigItem'
import { ListResponseDto } from '@server/modules/ucp/dto/list.dto'
import { API } from '../types'

export type UCPAPIS = {
  GetUcpList: API<undefined, undefined, typeof ListResponseDto>
  PostUcpCreate: API<undefined, typeof CreateDto, typeof CreateResponseDto>
  GetUcpDetail: API<typeof DetailDto, undefined, typeof DetailResponseDto>
  GetUcpConfigList: API<
    typeof ConfigListDto,
    undefined,
    typeof ConfigListResponseDto
  >
  GetUcpConfigAll: API<
    typeof ConfigListDto,
    undefined,
    typeof ConfigListAllResponseDto
  >
  PostUcpAppend: API<undefined, typeof AppendDto, undefined>
  PutUcpConfigUpdate: API<undefined, typeof EditConfigItemDto, undefined>
  DeleteUcpConfig: API<typeof EditConfigItemDto, undefined, undefined>
}
