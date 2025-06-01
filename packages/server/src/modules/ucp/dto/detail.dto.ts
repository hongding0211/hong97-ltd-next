import { IsString } from 'class-validator'

export class DetailDto {
  @IsString()
  id: string
}

export class DetailResponseDto {
  @IsString()
  id: string

  @IsString()
  desc: string
}
