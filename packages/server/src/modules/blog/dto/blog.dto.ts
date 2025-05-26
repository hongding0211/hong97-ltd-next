import { IsArray, IsOptional, IsString } from 'class-validator'
export class BlogDto {
  @IsString()
  title: string

  @IsArray()
  keywords: string[]

  @IsString()
  @IsOptional()
  coverImg?: string
}

export class BlogResponseDto {
  key: string
  title: string
  time: number
  keywords: string[]
  coverImg?: string
}
