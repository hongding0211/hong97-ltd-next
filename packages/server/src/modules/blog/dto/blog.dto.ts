import { Transform } from 'class-transformer'
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator'
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '../../../dtos/pagination.dto'
export class BlogDto {
  @IsString()
  title: string

  @IsArray()
  keywords: string[]

  @IsString()
  @IsOptional()
  coverImg?: string

  @IsBoolean()
  @IsOptional()
  authRequired?: boolean
}

export class BlogNew2Dto {
  @IsString()
  @IsOptional()
  title?: string

  @IsArray()
  @IsOptional()
  keywords?: string[]

  @IsString()
  @IsOptional()
  coverImg?: string

  @IsBoolean()
  @IsOptional()
  pinned?: boolean
}

export class BlogResponseDto {
  key: string
  title: string
  time: number
  keywords: string[]
  coverImg?: string
  authRequired?: boolean
  pinned?: boolean
  hasPublished?: boolean
  hidden2Public?: boolean
}

export class BlogsDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  includePinned?: boolean
}

export class BlogsResponseDto extends PaginationResponseDto<BlogResponseDto> {
  pinnedData?: Array<Partial<BlogResponseDto>>
  pinnedTotal?: number
}
