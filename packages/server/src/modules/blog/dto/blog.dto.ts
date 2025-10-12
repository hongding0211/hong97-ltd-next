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

export class BlogResponseDto {
  key: string
  title: string
  time: number
  keywords: string[]
  coverImg?: string
  authRequired?: boolean
}

export class BlogsDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  search?: string
}

export class BlogsResponseDto extends PaginationResponseDto<BlogResponseDto> {}
