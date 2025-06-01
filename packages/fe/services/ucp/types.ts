import {
  CreateDto,
  CreateResponseDto,
} from '@server/modules/ucp/dto/create.dto'
import { API } from '../types'
import { ListResponseDto } from '@server/modules/ucp/dto/list.dto'
import { DetailDto } from '@server/modules/ucp/dto/detail.dto'
import { DetailResponseDto } from '@server/modules/ucp/dto/detail.dto'
import { UcpDetailResponseDto } from '@server/modules/ucp/dto/ucpDetail.dto'
import { UcpDetailDto } from '@server/modules/ucp/dto/ucpDetail.dto'

export type UCPAPIS = {
  GetUcpList: API<undefined, undefined, typeof ListResponseDto>
  PostUcpCreate: API<undefined, typeof CreateDto, typeof CreateResponseDto>
  GetUcpDetail: API<undefined, typeof DetailDto, typeof DetailResponseDto>
  GetUcpDetailByUcpId: API<
    undefined,
    typeof UcpDetailDto,
    typeof UcpDetailResponseDto
  >
}
