import { Type } from 'class-transformer'
import { IsArray, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../dtos/pagination.dto'

export class QueryTrashDto extends PaginationQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  tags?: string[]
}
