import { IsString } from 'class-validator'
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '../../../dtos/pagination.dto'

export type UcpDetail = {
  friends: {
    title: string
    desc?: string
    link: string
    icon?: string
  }
}

export class UcpDetailDto extends PaginationQueryDto {
  @IsString()
  id: string
}

export class UcpDetailResponseDto extends PaginationResponseDto<
  UcpDetail[keyof UcpDetail]
> {}
