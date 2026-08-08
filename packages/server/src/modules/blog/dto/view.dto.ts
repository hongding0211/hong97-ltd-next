import { IsBoolean, IsNumber, IsString } from 'class-validator'

export class ViewDto {
  @IsString()
  blogId: string
}

export class ViewResponseDto {
  @IsString()
  blogId: string

  @IsBoolean()
  counted: boolean

  @IsNumber()
  viewCount: number
}
