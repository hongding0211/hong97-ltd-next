import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'

export class MetaDto {
  @IsString()
  blogId: string
}

export class MetaResponseDto {
  @IsString()
  blogId: string

  @IsString()
  blogTitle: string

  @IsNumber()
  likeCount: number

  @IsNumber()
  viewCount: number

  @IsBoolean()
  isLiked: boolean

  @IsNumber()
  time: number

  @IsString()
  @IsOptional()
  coverImg?: string

  @IsArray()
  keywords: string[]

  @IsBoolean()
  @IsOptional()
  authRequired?: boolean

  @IsString()
  @IsOptional()
  shortCode?: string

  @IsBoolean()
  @IsOptional()
  hasPublished?: boolean

  @IsBoolean()
  @IsOptional()
  hidden2Public?: boolean

  @IsNumber()
  @IsOptional()
  lastUpdateAt?: number
}

export class UpdateMetaDto {
  @IsString()
  blogId: string

  @IsString()
  @IsOptional()
  blogTitle?: string

  @IsString()
  @IsOptional()
  coverImg?: string

  @IsArray()
  @IsOptional()
  keywords?: string[]

  @IsBoolean()
  @IsOptional()
  authRequired?: boolean

  @IsString()
  @IsOptional()
  shortCode?: string

  @IsBoolean()
  @IsOptional()
  hasPublished?: boolean

  @IsBoolean()
  @IsOptional()
  hidden2Public?: boolean

  @IsNumber()
  @IsOptional()
  time?: number
}
