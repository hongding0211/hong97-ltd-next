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
}
