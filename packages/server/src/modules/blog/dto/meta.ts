import { IsBoolean, IsNumber, IsString } from 'class-validator'

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
}
