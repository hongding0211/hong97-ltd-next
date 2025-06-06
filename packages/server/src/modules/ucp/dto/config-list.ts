import { IsString } from 'class-validator'
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '../../../dtos/pagination.dto'

export class ConfigListDto extends PaginationQueryDto {
  @IsString()
  id: string
}

export class ConfigListResponseDto extends PaginationResponseDto<{
  id: string
  createdAt: number
  updatedAt: number
  raw: Record<string, any>
}> {}
