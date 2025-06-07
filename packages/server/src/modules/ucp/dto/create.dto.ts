import { IsArray, IsBoolean, IsString } from 'class-validator'

export class CreateDto {
  @IsString()
  desc: string

  @IsBoolean()
  publicRead: boolean
}

export class CreateResponseDto {
  @IsString()
  id: string

  @IsString()
  desc: string

  @IsArray()
  data: any[]

  @IsString()
  createdBy: string
}
