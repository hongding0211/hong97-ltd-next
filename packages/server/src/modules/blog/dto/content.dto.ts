import { IsString } from 'class-validator'

export class GetContentDto {
  @IsString()
  blogId: string
}

export class GetContentResponseDto {
  @IsString()
  blogId: string

  @IsString()
  content: string
}

export class PostContentDto {
  @IsString()
  blogId: string

  @IsString()
  content: string
}

export class PostContentResponseDto {
  @IsString()
  blogId: string

  @IsString()
  content: string
}
