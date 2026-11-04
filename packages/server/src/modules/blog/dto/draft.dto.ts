import { IsArray, IsNumber, IsString } from 'class-validator'

export class BlogEditSnapshotDto {
  @IsString()
  title: string

  @IsString()
  coverImg: string

  @IsArray()
  @IsString({ each: true })
  keywords: string[]

  @IsString()
  content: string
}

export class SaveBlogDraftDto extends BlogEditSnapshotDto {
  @IsString()
  blogId: string
}

export class BlogDraftDto extends BlogEditSnapshotDto {
  @IsNumber()
  savedAt: number
}

export class GetBlogDraftResponseDto {
  blogId: string
  draft: BlogDraftDto | null
}

export class SaveBlogResponseDto {
  blogId: string
  savedAt: number
}
