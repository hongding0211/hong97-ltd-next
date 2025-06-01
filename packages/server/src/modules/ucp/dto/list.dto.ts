import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '../../../dtos/pagination.dto'

export class ListDto extends PaginationQueryDto {}

export class ListResponseDto extends PaginationResponseDto<{
  id: string
  desc: string
}> {}
